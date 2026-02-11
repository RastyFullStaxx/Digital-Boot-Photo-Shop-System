import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const PHOTO_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".avi", ".mkv"]);

export function detectMediaKind(filePath: string): "photo" | "video" | null {
  const ext = path.extname(filePath).toLowerCase();
  if (PHOTO_EXTENSIONS.has(ext)) {
    return "photo";
  }
  if (VIDEO_EXTENSIONS.has(ext)) {
    return "video";
  }
  return null;
}

export async function generatePhotoPreview(sourcePath: string, previewPath: string): Promise<void> {
  await sharp(sourcePath)
    .rotate()
    .resize({ width: 700, height: 700, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toFile(previewPath);
}

export function fileSha1(filePath: string): string {
  const hash = crypto.createHash("sha1");
  const buffer = fs.readFileSync(filePath);
  hash.update(buffer);
  return hash.digest("hex");
}
