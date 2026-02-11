import { z } from "zod";

export const SessionStatusSchema = z.enum(["active", "completed", "cancelled"]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SyncStateSchema = z.enum(["pending", "synced", "failed"]);
export type SyncState = z.infer<typeof SyncStateSchema>;

export const MediaKindSchema = z.enum(["photo", "video"]);
export type MediaKind = z.infer<typeof MediaKindSchema>;

export const RenderStatusSchema = z.enum(["pending", "rendered", "failed"]);
export type RenderStatus = z.infer<typeof RenderStatusSchema>;

export const PrintJobStatusSchema = z.enum(["queued", "printing", "printed", "failed"]);
export type PrintJobStatus = z.infer<typeof PrintJobStatusSchema>;

export const PlacementSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0)
});
export type Placement = z.infer<typeof PlacementSchema>;

export const TemplateSlotSchema = z.object({
  id: z.string(),
  placement: PlacementSchema,
  cornerRadius: z.number().default(0)
});
export type TemplateSlot = z.infer<typeof TemplateSlotSchema>;

export const CanvasSizeSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  dpi: z.number().int().positive().default(300)
});
export type CanvasSize = z.infer<typeof CanvasSizeSchema>;

export const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  canvasSize: CanvasSizeSchema,
  slots: z.array(TemplateSlotSchema),
  safeAreas: z.array(PlacementSchema),
  printProfileId: z.string(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});
export type Template = z.infer<typeof TemplateSchema>;

export const SessionSchema = z.object({
  id: z.string(),
  boothId: z.string(),
  status: SessionStatusSchema,
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable().optional()
});
export type Session = z.infer<typeof SessionSchema>;

export const MediaAssetSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  kind: MediaKindSchema,
  localPath: z.string(),
  previewPath: z.string().nullable(),
  capturedAt: z.string().datetime(),
  syncState: SyncStateSchema,
  hash: z.string().nullable().optional()
});
export type MediaAsset = z.infer<typeof MediaAssetSchema>;

export const FilterSpecSchema = z.object({
  id: z.string(),
  intensity: z.number().min(0).max(1)
});
export type FilterSpec = z.infer<typeof FilterSpecSchema>;

export const StickerSpecSchema = z.object({
  id: z.string(),
  assetPath: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0)
});
export type StickerSpec = z.infer<typeof StickerSpecSchema>;

export const EditProjectSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  selectedAssetIds: z.array(z.string()).min(1),
  filterStack: z.array(FilterSpecSchema),
  stickers: z.array(StickerSpecSchema),
  templateId: z.string(),
  renderStatus: RenderStatusSchema,
  outputPath: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});
export type EditProject = z.infer<typeof EditProjectSchema>;

export const PrintJobSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  copies: z.number().int().positive(),
  status: PrintJobStatusSchema,
  printerName: z.string(),
  errorCode: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type PrintJob = z.infer<typeof PrintJobSchema>;

export const ShareLinkSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  publicToken: z.string(),
  url: z.string().url(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable()
});
export type ShareLink = z.infer<typeof ShareLinkSchema>;

export const BrandProfileSchema = z.object({
  id: z.string(),
  logoAssetId: z.string(),
  logoPlacement: PlacementSchema,
  qrPlacement: PlacementSchema,
  defaultTheme: z.string()
});
export type BrandProfile = z.infer<typeof BrandProfileSchema>;

export const CreateSessionBodySchema = z.object({
  boothId: z.string()
});

export const CreateProjectBodySchema = z.object({
  sessionId: z.string(),
  selectedAssetIds: z.array(z.string()).min(1),
  filterStack: z.array(FilterSpecSchema).default([]),
  stickers: z.array(StickerSpecSchema).default([]),
  templateId: z.string()
});

export const UpdateProjectBodySchema = z.object({
  selectedAssetIds: z.array(z.string()).min(1).optional(),
  filterStack: z.array(FilterSpecSchema).optional(),
  stickers: z.array(StickerSpecSchema).optional(),
  templateId: z.string().optional()
});

export const RenderProjectBodySchema = z.object({
  brandProfileId: z.string(),
  qrTargetUrl: z.string().url()
});

export const CreatePrintJobBodySchema = z.object({
  projectId: z.string(),
  copies: z.number().int().positive(),
  printerProfileId: z.string()
});

export const SyncSessionBodySchema = SessionSchema;
export const SyncAssetBodySchema = MediaAssetSchema;

export const SyncFinalBodySchema = z.object({
  projectId: z.string(),
  sessionId: z.string(),
  outputPath: z.string(),
  shareToken: z.string(),
  shareUrl: z.string().url(),
  imageBase64: z.string().optional()
});

export const RetentionRunBodySchema = z.object({
  olderThanDays: z.number().int().positive().default(90)
});

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string()
});

export const HealthSchema = z.object({
  ok: z.boolean(),
  service: z.literal("local-agent"),
  uptimeSeconds: z.number(),
  watchedDirectory: z.string(),
  pendingSyncCount: z.number(),
  timestamp: z.string().datetime()
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type HealthResponse = z.infer<typeof HealthSchema>;
