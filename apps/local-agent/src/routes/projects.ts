import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { CreateProjectBodySchema, RenderProjectBodySchema, UpdateProjectBodySchema } from "@photobooth/shared-types";
import type { AppContext } from "../types/context.js";
import { renderProjectOutput } from "../services/render.js";

export async function registerProjectRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  app.post("/api/v1/projects", async (request, reply) => {
    const parsed = CreateProjectBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "INVALID_PAYLOAD",
        message: parsed.error.message
      });
    }

    const session = context.db.getSession(parsed.data.sessionId);
    if (!session) {
      return reply.status(404).send({
        error: "SESSION_NOT_FOUND",
        message: `No session found for id ${parsed.data.sessionId}`
      });
    }

    const selectedAssets = context.db
      .getMediaByIds(parsed.data.selectedAssetIds)
      .filter((asset) => asset.sessionId === parsed.data.sessionId);

    if (selectedAssets.length === 0) {
      return reply.status(422).send({
        error: "NO_VALID_SELECTED_ASSETS",
        message: "No selected assets were found for this session."
      });
    }

    const project = context.db.createProject({
      sessionId: parsed.data.sessionId,
      selectedAssetIds: selectedAssets.map((asset) => asset.id),
      filterStack: parsed.data.filterStack,
      stickers: parsed.data.stickers,
      templateId: parsed.data.templateId
    });

    return reply.status(201).send(project);
  });

  app.post("/api/v1/projects/:projectId/render", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const parsed = RenderProjectBodySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "INVALID_PAYLOAD",
        message: parsed.error.message
      });
    }

    const project = context.db.getProject(projectId);
    if (!project) {
      return reply.status(404).send({
        error: "PROJECT_NOT_FOUND",
        message: `No project found for id ${projectId}`
      });
    }

    const template = context.db.getTemplate(project.templateId);
    if (!template) {
      return reply.status(404).send({
        error: "TEMPLATE_NOT_FOUND",
        message: `No template found for id ${project.templateId}`
      });
    }

    const brandProfile = context.db.getBrandProfile(parsed.data.brandProfileId);
    if (!brandProfile) {
      return reply.status(404).send({
        error: "BRAND_PROFILE_NOT_FOUND",
        message: `No brand profile found for id ${parsed.data.brandProfileId}`
      });
    }

    const assets = context.db.getMediaByIds(project.selectedAssetIds);
    const photoAssets = assets.filter((asset) => asset.kind === "photo");

    if (photoAssets.length === 0) {
      return reply.status(422).send({
        error: "NO_PHOTO_MEDIA_SELECTED",
        message: "Project render requires at least one photo asset."
      });
    }

    try {
      const token = crypto.randomBytes(16).toString("hex");
      const qrBase = parsed.data.qrTargetUrl.replace(/\/+$/, "");
      const shareUrl = `${qrBase}/${token}`;
      const outputPath = await renderProjectOutput({
        project,
        template,
        mediaAssets: photoAssets,
        brandProfile,
        qrTargetUrl: shareUrl
      });

      context.db.updateProjectRender(project.id, "rendered", outputPath);
      context.db.createShareLink(project.id, token, shareUrl);

      return {
        projectId: project.id,
        status: "rendered",
        outputPath,
        shareUrl
      };
    } catch (error) {
      context.db.updateProjectRender(project.id, "failed", null);

      request.log.error({ error, projectId }, "Render failed");
      return reply.status(500).send({
        error: "RENDER_FAILED",
        message: "Project render failed. Check local agent logs."
      });
    }
  });

  app.get("/api/v1/projects/:projectId", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const project = context.db.getProject(projectId);

    if (!project) {
      return reply.status(404).send({
        error: "PROJECT_NOT_FOUND",
        message: `No project found for id ${projectId}`
      });
    }

    return project;
  });

  app.patch("/api/v1/projects/:projectId", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const parsed = UpdateProjectBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "INVALID_PAYLOAD",
        message: parsed.error.message
      });
    }

    const updated = context.db.updateProject(projectId, parsed.data);
    if (!updated) {
      return reply.status(404).send({
        error: "PROJECT_NOT_FOUND",
        message: `No project found for id ${projectId}`
      });
    }

    return updated;
  });
}
