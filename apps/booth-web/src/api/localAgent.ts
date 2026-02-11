import type { BrandProfile, EditProject } from "@photobooth/shared-types";
import type { ApiError, HealthResponse, MediaAsset, PrintJob, RenderResponse, Session, SyncResponse, Template } from "../types/api";

const API_BASE = import.meta.env.VITE_LOCAL_AGENT_URL ?? "http://127.0.0.1:4477/api/v1";
const LOCAL_AGENT_ORIGIN = API_BASE.replace(/\/api\/v1$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "content-type": "application/json"
    },
    ...init
  });

  if (!response.ok) {
    let errorPayload: ApiError | undefined;
    try {
      errorPayload = (await response.json()) as ApiError;
    } catch {
      errorPayload = undefined;
    }

    throw new Error(errorPayload?.message ?? `Request failed for ${path}`);
  }

  return (await response.json()) as T;
}

export function localFileUrl(filePath: string | null): string | null {
  if (!filePath) {
    return null;
  }

  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  const fileName = parts[parts.length - 1];

  if (normalized.includes("/previews/")) {
    return `${LOCAL_AGENT_ORIGIN}/files/previews/${fileName}`;
  }

  if (normalized.includes("/renders/")) {
    return `${LOCAL_AGENT_ORIGIN}/files/renders/${fileName}`;
  }

  if (normalized.includes("/media/")) {
    return `${LOCAL_AGENT_ORIGIN}/files/media/${fileName}`;
  }

  return null;
}

export async function createSession(boothId: string): Promise<Session> {
  return request<Session>("/sessions", {
    method: "POST",
    body: JSON.stringify({ boothId })
  });
}

export async function getActiveSession(): Promise<Session | null> {
  return request<Session | null>("/sessions/active");
}

export async function completeSession(sessionId: string): Promise<{ ok: boolean; sessionId: string }> {
  return request<{ ok: boolean; sessionId: string }>(`/sessions/${sessionId}/complete`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function listSessionMedia(sessionId: string): Promise<MediaAsset[]> {
  return request<MediaAsset[]>(`/sessions/${sessionId}/media`);
}

export async function listTemplates(): Promise<Template[]> {
  return request<Template[]>("/templates");
}

export async function createProject(payload: {
  sessionId: string;
  selectedAssetIds: string[];
  filterStack?: Array<{ id: string; intensity: number }>;
  stickers?: Array<{
    id: string;
    assetPath: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  }>;
  templateId: string;
}): Promise<EditProject> {
  return request<EditProject>("/projects", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      filterStack: payload.filterStack ?? [],
      stickers: payload.stickers ?? []
    })
  });
}

export async function getProject(projectId: string): Promise<EditProject> {
  return request<EditProject>(`/projects/${projectId}`);
}

export async function updateProject(
  projectId: string,
  payload: {
    selectedAssetIds?: string[];
    filterStack?: Array<{ id: string; intensity: number }>;
    stickers?: Array<{
      id: string;
      assetPath: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation?: number;
    }>;
    templateId?: string;
  }
): Promise<EditProject> {
  return request<EditProject>(`/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function renderProject(projectId: string, payload: { brandProfileId: string; qrTargetUrl: string }): Promise<RenderResponse> {
  return request<RenderResponse>(`/projects/${projectId}/render`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function createPrintJob(projectId: string, copies: number, printerProfileId: string): Promise<PrintJob> {
  return request<PrintJob>("/print-jobs", {
    method: "POST",
    body: JSON.stringify({ projectId, copies, printerProfileId })
  });
}

export async function getPrintJob(printJobId: string): Promise<PrintJob> {
  return request<PrintJob>(`/print-jobs/${printJobId}`);
}

export async function triggerSync(): Promise<SyncResponse> {
  return request<SyncResponse>("/sync/run", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

export async function getBrandProfile(): Promise<BrandProfile> {
  return request<BrandProfile>("/brand-profile");
}
