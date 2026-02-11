import crypto from "node:crypto";
import { BrandProfileSchema, MediaAssetSchema, SessionSchema, SyncFinalBodySchema, TemplateSchema, type BrandProfile, type MediaAsset, type Session, type Template } from "@photobooth/shared-types";

interface FinalRecord {
  projectId: string;
  sessionId: string;
  outputPath: string;
  shareToken: string;
  shareUrl: string;
  imageBase64?: string;
  createdAt: string;
}

interface AuditRecord {
  id: string;
  action: string;
  actor: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

interface MemoryStore {
  sessions: Map<string, Session>;
  assets: Map<string, MediaAsset>;
  finals: Map<string, FinalRecord>;
  templates: Map<string, Template>;
  brandProfiles: Map<string, BrandProfile>;
  audits: AuditRecord[];
}

const globalStore = globalThis as unknown as { __photoboothStore?: MemoryStore };

function createStore(): MemoryStore {
  return {
    sessions: new Map(),
    assets: new Map(),
    finals: new Map(),
    templates: new Map(),
    brandProfiles: new Map(),
    audits: []
  };
}

export const store = globalStore.__photoboothStore ?? createStore();
if (!globalStore.__photoboothStore) {
  globalStore.__photoboothStore = store;
}

if (!store.templates.has("tmpl-4x6-classic")) {
  store.templates.set("tmpl-4x6-classic", {
    id: "tmpl-4x6-classic",
    name: "Classic 4x6",
    canvasSize: { width: 1200, height: 1800, dpi: 300 },
    slots: [{ id: "slot-1", placement: { x: 80, y: 220, width: 1040, height: 1360, rotation: 0 }, cornerRadius: 10 }],
    safeAreas: [{ x: 20, y: 20, width: 1160, height: 1760, rotation: 0 }],
    printProfileId: "print-4x6-300dpi"
  });
}

if (!store.brandProfiles.has("brand-default")) {
  store.brandProfiles.set("brand-default", {
    id: "brand-default",
    logoAssetId: "brand/logo.png",
    logoPlacement: { x: 40, y: 40, width: 280, height: 110, rotation: 0 },
    qrPlacement: { x: 930, y: 1540, width: 220, height: 220, rotation: 0 },
    defaultTheme: "classic"
  });
}

export function upsertSession(session: Session): Session {
  const parsed = SessionSchema.parse(session);
  store.sessions.set(parsed.id, parsed);
  return parsed;
}

export function upsertAsset(asset: MediaAsset): MediaAsset {
  const parsed = MediaAssetSchema.parse(asset);
  store.assets.set(parsed.id, parsed);
  return parsed;
}

export function upsertFinal(input: {
  projectId: string;
  sessionId: string;
  outputPath: string;
  shareToken: string;
  shareUrl: string;
  imageBase64?: string;
}): FinalRecord {
  const parsed = SyncFinalBodySchema.parse(input);
  const record: FinalRecord = {
    ...parsed,
    createdAt: new Date().toISOString()
  };

  store.finals.set(parsed.shareToken, record);
  return record;
}

export function getFinalByToken(token: string): FinalRecord | null {
  return store.finals.get(token) ?? null;
}

export function listSessions(page = 1, pageSize = 20): {
  total: number;
  page: number;
  pageSize: number;
  items: Array<Session & { assetsCount: number; finalsCount: number }>;
} {
  const sessions = Array.from(store.sessions.values()).sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  const start = (page - 1) * pageSize;
  const items = sessions.slice(start, start + pageSize).map((session) => {
    const assetsCount = Array.from(store.assets.values()).filter((asset) => asset.sessionId === session.id).length;
    const finalsCount = Array.from(store.finals.values()).filter((finalRecord) => finalRecord.sessionId === session.id).length;

    return {
      ...session,
      assetsCount,
      finalsCount
    };
  });

  return {
    total: sessions.length,
    page,
    pageSize,
    items
  };
}

export function upsertTemplate(template: Template): Template {
  const parsed = TemplateSchema.parse(template);
  store.templates.set(parsed.id, parsed);
  return parsed;
}

export function listTemplates(): Template[] {
  return Array.from(store.templates.values());
}

export function upsertBrandProfile(profile: BrandProfile): BrandProfile {
  const parsed = BrandProfileSchema.parse(profile);
  store.brandProfiles.set(parsed.id, parsed);
  return parsed;
}

export function getBrandProfile(id = "brand-default"): BrandProfile | null {
  return store.brandProfiles.get(id) ?? null;
}

export function runRetention(olderThanDays: number): {
  deletedSessions: number;
  deletedAssets: number;
  deletedFinals: number;
} {
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  let deletedFinals = 0;
  let deletedAssets = 0;
  let deletedSessions = 0;

  for (const [token, finalRecord] of store.finals.entries()) {
    if (Date.parse(finalRecord.createdAt) < cutoff) {
      store.finals.delete(token);
      deletedFinals += 1;
    }
  }

  for (const [assetId, asset] of store.assets.entries()) {
    if (Date.parse(asset.capturedAt) < cutoff) {
      store.assets.delete(assetId);
      deletedAssets += 1;
    }
  }

  for (const [sessionId, session] of store.sessions.entries()) {
    if (Date.parse(session.startedAt) < cutoff) {
      store.sessions.delete(sessionId);
      deletedSessions += 1;
    }
  }

  return {
    deletedSessions,
    deletedAssets,
    deletedFinals
  };
}

export function appendAudit(action: string, actor: string, payload: Record<string, unknown>): void {
  store.audits.unshift({
    id: crypto.randomUUID(),
    action,
    actor,
    payload,
    createdAt: new Date().toISOString()
  });

  if (store.audits.length > 1000) {
    store.audits = store.audits.slice(0, 1000);
  }
}

export function listAudits(limit = 50): AuditRecord[] {
  return store.audits.slice(0, limit);
}
