import type { EditProject, HealthResponse, MediaAsset, PrintJob, Session, Template } from "@photobooth/shared-types";

export interface RenderResponse {
  projectId: string;
  status: "rendered";
  outputPath: string;
  shareUrl: string;
}

export interface SyncResponse {
  ok: boolean;
  sessionsSynced: number;
  assetsSynced: number;
  finalsSynced: number;
  failures: number;
}

export interface ApiError {
  error: string;
  message: string;
}

export type {
  EditProject,
  HealthResponse,
  MediaAsset,
  PrintJob,
  Session,
  Template
};
