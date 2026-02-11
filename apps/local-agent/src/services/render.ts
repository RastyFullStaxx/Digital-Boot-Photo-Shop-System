import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import { fitAssetsToTemplate } from "@photobooth/template-engine";
import type { BrandProfile, EditProject, FilterSpec, MediaAsset, Template } from "@photobooth/shared-types";
import { config } from "../config/index.js";

function clampPlacement(placement: { x: number; y: number; width: number; height: number }, maxWidth: number, maxHeight: number) {
  const x = Math.max(0, Math.min(placement.x, maxWidth - 1));
  const y = Math.max(0, Math.min(placement.y, maxHeight - 1));
  const width = Math.max(1, Math.min(placement.width, maxWidth - x));
  const height = Math.max(1, Math.min(placement.height, maxHeight - y));
  return { x, y, width, height };
}

function applyPhotoFilters(pipeline: sharp.Sharp, filterStack: FilterSpec[]): sharp.Sharp {
  let output = pipeline;

  for (const filter of filterStack) {
    switch (filter.id) {
      case "grayscale": {
        if (filter.intensity >= 0.4) {
          output = output.grayscale();
        }
        break;
      }
      case "brighten": {
        output = output.modulate({
          brightness: 1 + filter.intensity * 0.25
        });
        break;
      }
      case "contrast": {
        output = output.linear(1 + filter.intensity * 0.4, -20 * filter.intensity);
        break;
      }
      case "vivid": {
        output = output.modulate({
          saturation: 1 + filter.intensity * 0.5
        });
        break;
      }
      default:
        break;
    }
  }

  return output;
}

export async function renderProjectOutput(input: {
  project: EditProject;
  template: Template;
  mediaAssets: MediaAsset[];
  brandProfile: BrandProfile;
  qrTargetUrl: string;
}): Promise<string> {
  const { project, template, mediaAssets, brandProfile, qrTargetUrl } = input;

  const outputId = `${project.id}-${uuidv4()}`;
  const outputPath = path.join(config.renderDirectory, `${outputId}.jpg`);

  const canvas = sharp({
    create: {
      width: template.canvasSize.width,
      height: template.canvasSize.height,
      channels: 3,
      background: "#ffffff"
    }
  });

  const slotAssignments = fitAssetsToTemplate(template, project.selectedAssetIds);

  const composites: sharp.OverlayOptions[] = [];

  for (const assignment of slotAssignments) {
    const media = mediaAssets.find((item) => item.id === assignment.sourceAssetId);
    if (!media) {
      continue;
    }

    const slot = clampPlacement(
      assignment.placement,
      template.canvasSize.width,
      template.canvasSize.height
    );

    const slotPipeline = sharp(media.localPath).rotate().resize(slot.width, slot.height, { fit: "cover" });
    const slotBuffer = await applyPhotoFilters(slotPipeline, project.filterStack).jpeg({ quality: 90 }).toBuffer();

    composites.push({
      input: slotBuffer,
      left: Math.round(slot.x),
      top: Math.round(slot.y)
    });
  }

  for (const sticker of project.stickers) {
    const stickerPlacement = clampPlacement(sticker, template.canvasSize.width, template.canvasSize.height);
    const stickerPath = path.isAbsolute(sticker.assetPath)
      ? sticker.assetPath
      : path.resolve(config.mediaDirectory, sticker.assetPath);

    if (!fs.existsSync(stickerPath)) {
      continue;
    }

    const stickerBuffer = await sharp(stickerPath)
      .rotate(sticker.rotation ?? 0)
      .resize(stickerPlacement.width, stickerPlacement.height, { fit: "contain" })
      .png()
      .toBuffer();

    composites.push({
      input: stickerBuffer,
      left: Math.round(stickerPlacement.x),
      top: Math.round(stickerPlacement.y)
    });
  }

  const qrPlacement = clampPlacement(
    brandProfile.qrPlacement,
    template.canvasSize.width,
    template.canvasSize.height
  );

  const qrBuffer = await QRCode.toBuffer(qrTargetUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: qrPlacement.width,
    color: {
      dark: "#000000",
      light: "#FFFFFF"
    }
  });

  composites.push({
    input: qrBuffer,
    left: Math.round(qrPlacement.x),
    top: Math.round(qrPlacement.y)
  });

  const logoAssetPath = path.resolve(config.mediaDirectory, brandProfile.logoAssetId);
  if (fs.existsSync(logoAssetPath)) {
    const logoPlacement = clampPlacement(
      brandProfile.logoPlacement,
      template.canvasSize.width,
      template.canvasSize.height
    );

    const logoBuffer = await sharp(logoAssetPath)
      .rotate()
      .resize(logoPlacement.width, logoPlacement.height, { fit: "contain" })
      .png()
      .toBuffer();

    composites.push({
      input: logoBuffer,
      left: Math.round(logoPlacement.x),
      top: Math.round(logoPlacement.y)
    });
  }

  await canvas.composite(composites).jpeg({ quality: 95 }).toFile(outputPath);

  return outputPath;
}
