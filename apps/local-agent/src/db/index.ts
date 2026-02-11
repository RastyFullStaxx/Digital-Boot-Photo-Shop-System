import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type {
  BrandProfile,
  EditProject,
  MediaAsset,
  PrintJob,
  Session,
  ShareLink,
  Template
} from "@photobooth/shared-types";
import { config } from "../config/index.js";

interface DbRow {
  [key: string]: unknown;
}

function nowIso(): string {
  return new Date().toISOString();
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export class LocalAgentDatabase {
  private readonly db: Database.Database;

  constructor(private readonly dbPath: string = path.join(config.dataDirectory, "local-agent.db")) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
  }

  initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        booth_id TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        sync_state TEXT NOT NULL DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS media_assets (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        local_path TEXT NOT NULL,
        preview_path TEXT,
        captured_at TEXT NOT NULL,
        sync_state TEXT NOT NULL DEFAULT 'pending',
        hash TEXT,
        FOREIGN KEY(session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS edit_projects (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        selected_asset_ids TEXT NOT NULL,
        filter_stack TEXT NOT NULL,
        stickers TEXT NOT NULL,
        template_id TEXT NOT NULL,
        render_status TEXT NOT NULL,
        output_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_state TEXT NOT NULL DEFAULT 'pending',
        FOREIGN KEY(session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS print_jobs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        copies INTEGER NOT NULL,
        printer_profile_id TEXT NOT NULL,
        printer_name TEXT NOT NULL,
        status TEXT NOT NULL,
        error_code TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES edit_projects(id)
      );

      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        canvas_width INTEGER NOT NULL,
        canvas_height INTEGER NOT NULL,
        canvas_dpi INTEGER NOT NULL,
        slots_json TEXT NOT NULL,
        safe_areas_json TEXT NOT NULL,
        print_profile_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS brand_profiles (
        id TEXT PRIMARY KEY,
        logo_asset_id TEXT NOT NULL,
        logo_placement_json TEXT NOT NULL,
        qr_placement_json TEXT NOT NULL,
        default_theme TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS share_links (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        public_token TEXT NOT NULL UNIQUE,
        url TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT,
        FOREIGN KEY(project_id) REFERENCES edit_projects(id)
      );

      CREATE INDEX IF NOT EXISTS idx_media_assets_session_id ON media_assets(session_id);
      CREATE INDEX IF NOT EXISTS idx_edit_projects_session_id ON edit_projects(session_id);
      CREATE INDEX IF NOT EXISTS idx_print_jobs_project_id ON print_jobs(project_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
      CREATE INDEX IF NOT EXISTS idx_media_assets_sync_state ON media_assets(sync_state);
      CREATE INDEX IF NOT EXISTS idx_sessions_sync_state ON sessions(sync_state);
      CREATE INDEX IF NOT EXISTS idx_edit_projects_sync_state ON edit_projects(sync_state);
    `);

    this.seedDefaults();
  }

  private seedDefaults(): void {
    const templateExists = this.db.prepare("SELECT id FROM templates WHERE id = ?").get("tmpl-4x6-classic");

    if (!templateExists) {
      const now = nowIso();
      this.db
        .prepare(
          `INSERT INTO templates (
            id, name, canvas_width, canvas_height, canvas_dpi, slots_json,
            safe_areas_json, print_profile_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          "tmpl-4x6-classic",
          "Classic 4x6",
          1200,
          1800,
          300,
          JSON.stringify([
            {
              id: "slot-1",
              placement: { x: 80, y: 220, width: 1040, height: 1360, rotation: 0 },
              cornerRadius: 12
            }
          ]),
          JSON.stringify([{ x: 20, y: 20, width: 1160, height: 1760, rotation: 0 }]),
          "print-4x6-300dpi",
          now,
          now
        );
    }

    const brandExists = this.db.prepare("SELECT id FROM brand_profiles WHERE id = ?").get("brand-default");

    if (!brandExists) {
      this.db
        .prepare(
          `INSERT INTO brand_profiles (
            id, logo_asset_id, logo_placement_json, qr_placement_json, default_theme
          ) VALUES (?, ?, ?, ?, ?)`
        )
        .run(
          "brand-default",
          "brand/logo.png",
          JSON.stringify({ x: 40, y: 40, width: 280, height: 110, rotation: 0 }),
          JSON.stringify({ x: 930, y: 1540, width: 220, height: 220, rotation: 0 }),
          "classic"
        );
    }
  }

  createSession(boothId: string): Session {
    const session: Session = {
      id: uuidv4(),
      boothId,
      status: "active",
      startedAt: nowIso(),
      endedAt: null
    };

    this.db
      .prepare(
        `INSERT INTO sessions (id, booth_id, status, started_at, ended_at, sync_state)
         VALUES (?, ?, ?, ?, ?, 'pending')`
      )
      .run(session.id, session.boothId, session.status, session.startedAt, session.endedAt);

    return session;
  }

  getSession(sessionId: string): Session | null {
    const row = this.db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as DbRow | undefined;
    if (!row) {
      return null;
    }

    return {
      id: String(row.id),
      boothId: String(row.booth_id),
      status: row.status as Session["status"],
      startedAt: String(row.started_at),
      endedAt: row.ended_at ? String(row.ended_at) : null
    };
  }

  getActiveSession(): Session | null {
    const row = this.db
      .prepare("SELECT * FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1")
      .get() as DbRow | undefined;

    if (!row) {
      return null;
    }

    return {
      id: String(row.id),
      boothId: String(row.booth_id),
      status: row.status as Session["status"],
      startedAt: String(row.started_at),
      endedAt: row.ended_at ? String(row.ended_at) : null
    };
  }

  ensureActiveSession(boothId: string): Session {
    const existing = this.getActiveSession();
    if (existing) {
      return existing;
    }

    return this.createSession(boothId);
  }

  completeSession(sessionId: string): void {
    this.db
      .prepare("UPDATE sessions SET status = 'completed', ended_at = ?, sync_state = 'pending' WHERE id = ?")
      .run(nowIso(), sessionId);
  }

  addMediaAsset(asset: Omit<MediaAsset, "id" | "syncState">): MediaAsset {
    const media: MediaAsset = {
      id: uuidv4(),
      sessionId: asset.sessionId,
      kind: asset.kind,
      localPath: asset.localPath,
      previewPath: asset.previewPath,
      capturedAt: asset.capturedAt,
      syncState: "pending",
      hash: asset.hash
    };

    this.db
      .prepare(
        `INSERT INTO media_assets (
          id, session_id, kind, local_path, preview_path, captured_at, sync_state, hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        media.id,
        media.sessionId,
        media.kind,
        media.localPath,
        media.previewPath,
        media.capturedAt,
        media.syncState,
        media.hash ?? null
      );

    return media;
  }

  listMediaBySession(sessionId: string): MediaAsset[] {
    const rows = this.db
      .prepare("SELECT * FROM media_assets WHERE session_id = ? ORDER BY captured_at ASC")
      .all(sessionId) as DbRow[];

    return rows.map((row) => ({
      id: String(row.id),
      sessionId: String(row.session_id),
      kind: row.kind as MediaAsset["kind"],
      localPath: String(row.local_path),
      previewPath: row.preview_path ? String(row.preview_path) : null,
      capturedAt: String(row.captured_at),
      syncState: row.sync_state as MediaAsset["syncState"],
      hash: row.hash ? String(row.hash) : null
    }));
  }

  getMediaByIds(assetIds: string[]): MediaAsset[] {
    if (assetIds.length === 0) {
      return [];
    }

    const placeholders = assetIds.map(() => "?").join(", ");
    const rows = this.db
      .prepare(`SELECT * FROM media_assets WHERE id IN (${placeholders})`)
      .all(...assetIds) as DbRow[];

    return rows.map((row) => ({
      id: String(row.id),
      sessionId: String(row.session_id),
      kind: row.kind as MediaAsset["kind"],
      localPath: String(row.local_path),
      previewPath: row.preview_path ? String(row.preview_path) : null,
      capturedAt: String(row.captured_at),
      syncState: row.sync_state as MediaAsset["syncState"],
      hash: row.hash ? String(row.hash) : null
    }));
  }

  createProject(payload: {
    sessionId: string;
    selectedAssetIds: string[];
    filterStack: unknown[];
    stickers: unknown[];
    templateId: string;
  }): EditProject {
    const now = nowIso();
    const project: EditProject = {
      id: uuidv4(),
      sessionId: payload.sessionId,
      selectedAssetIds: payload.selectedAssetIds,
      filterStack: payload.filterStack as EditProject["filterStack"],
      stickers: payload.stickers as EditProject["stickers"],
      templateId: payload.templateId,
      renderStatus: "pending",
      outputPath: null,
      createdAt: now,
      updatedAt: now
    };

    this.db
      .prepare(
        `INSERT INTO edit_projects (
          id, session_id, selected_asset_ids, filter_stack, stickers, template_id,
          render_status, output_path, created_at, updated_at, sync_state
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
      )
      .run(
        project.id,
        project.sessionId,
        JSON.stringify(project.selectedAssetIds),
        JSON.stringify(project.filterStack),
        JSON.stringify(project.stickers),
        project.templateId,
        project.renderStatus,
        project.outputPath,
        now,
        now
      );

    return project;
  }

  updateProject(
    projectId: string,
    updates: Partial<Pick<EditProject, "selectedAssetIds" | "filterStack" | "stickers" | "templateId">>
  ): EditProject | null {
    const existing = this.getProject(projectId);
    if (!existing) {
      return null;
    }

    const merged: EditProject = {
      ...existing,
      selectedAssetIds: updates.selectedAssetIds ?? existing.selectedAssetIds,
      filterStack: updates.filterStack ?? existing.filterStack,
      stickers: updates.stickers ?? existing.stickers,
      templateId: updates.templateId ?? existing.templateId,
      updatedAt: nowIso()
    };

    this.db
      .prepare(
        `UPDATE edit_projects SET
          selected_asset_ids = ?,
          filter_stack = ?,
          stickers = ?,
          template_id = ?,
          updated_at = ?,
          sync_state = 'pending'
        WHERE id = ?`
      )
      .run(
        JSON.stringify(merged.selectedAssetIds),
        JSON.stringify(merged.filterStack),
        JSON.stringify(merged.stickers),
        merged.templateId,
        merged.updatedAt,
        projectId
      );

    return merged;
  }

  getProject(projectId: string): EditProject | null {
    const row = this.db.prepare("SELECT * FROM edit_projects WHERE id = ?").get(projectId) as DbRow | undefined;
    if (!row) {
      return null;
    }

    return {
      id: String(row.id),
      sessionId: String(row.session_id),
      selectedAssetIds: parseJson<string[]>(row.selected_asset_ids, []),
      filterStack: parseJson<EditProject["filterStack"]>(row.filter_stack, []),
      stickers: parseJson<EditProject["stickers"]>(row.stickers, []),
      templateId: String(row.template_id),
      renderStatus: row.render_status as EditProject["renderStatus"],
      outputPath: row.output_path ? String(row.output_path) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  updateProjectRender(projectId: string, status: EditProject["renderStatus"], outputPath: string | null): void {
    this.db
      .prepare(
        "UPDATE edit_projects SET render_status = ?, output_path = ?, updated_at = ?, sync_state = 'pending' WHERE id = ?"
      )
      .run(status, outputPath, nowIso(), projectId);
  }

  createPrintJob(input: { projectId: string; copies: number; printerProfileId: string; printerName: string }): PrintJob {
    const now = nowIso();
    const job: PrintJob = {
      id: uuidv4(),
      projectId: input.projectId,
      copies: input.copies,
      status: "queued",
      printerName: input.printerName,
      errorCode: null,
      createdAt: now,
      updatedAt: now
    };

    this.db
      .prepare(
        `INSERT INTO print_jobs (
          id, project_id, copies, printer_profile_id, printer_name, status, error_code, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        job.id,
        job.projectId,
        job.copies,
        input.printerProfileId,
        job.printerName,
        job.status,
        job.errorCode,
        job.createdAt,
        job.updatedAt
      );

    return job;
  }

  updatePrintJobStatus(jobId: string, status: PrintJob["status"], errorCode: string | null = null): void {
    this.db
      .prepare("UPDATE print_jobs SET status = ?, error_code = ?, updated_at = ? WHERE id = ?")
      .run(status, errorCode, nowIso(), jobId);
  }

  getPrintJob(jobId: string): PrintJob | null {
    const row = this.db.prepare("SELECT * FROM print_jobs WHERE id = ?").get(jobId) as DbRow | undefined;
    if (!row) {
      return null;
    }

    return {
      id: String(row.id),
      projectId: String(row.project_id),
      copies: Number(row.copies),
      status: row.status as PrintJob["status"],
      printerName: String(row.printer_name),
      errorCode: row.error_code ? String(row.error_code) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  getTemplate(templateId: string): Template | null {
    const row = this.db.prepare("SELECT * FROM templates WHERE id = ?").get(templateId) as DbRow | undefined;
    if (!row) {
      return null;
    }

    return {
      id: String(row.id),
      name: String(row.name),
      canvasSize: {
        width: Number(row.canvas_width),
        height: Number(row.canvas_height),
        dpi: Number(row.canvas_dpi)
      },
      slots: parseJson<Template["slots"]>(row.slots_json, []),
      safeAreas: parseJson<Template["safeAreas"]>(row.safe_areas_json, []),
      printProfileId: String(row.print_profile_id),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  listTemplates(): Template[] {
    const rows = this.db.prepare("SELECT * FROM templates ORDER BY updated_at DESC").all() as DbRow[];

    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      canvasSize: {
        width: Number(row.canvas_width),
        height: Number(row.canvas_height),
        dpi: Number(row.canvas_dpi)
      },
      slots: parseJson<Template["slots"]>(row.slots_json, []),
      safeAreas: parseJson<Template["safeAreas"]>(row.safe_areas_json, []),
      printProfileId: String(row.print_profile_id),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  upsertTemplate(template: Template): Template {
    const now = nowIso();
    this.db
      .prepare(
        `INSERT INTO templates (
          id, name, canvas_width, canvas_height, canvas_dpi, slots_json,
          safe_areas_json, print_profile_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          canvas_width = excluded.canvas_width,
          canvas_height = excluded.canvas_height,
          canvas_dpi = excluded.canvas_dpi,
          slots_json = excluded.slots_json,
          safe_areas_json = excluded.safe_areas_json,
          print_profile_id = excluded.print_profile_id,
          updated_at = excluded.updated_at`
      )
      .run(
        template.id,
        template.name,
        template.canvasSize.width,
        template.canvasSize.height,
        template.canvasSize.dpi,
        JSON.stringify(template.slots),
        JSON.stringify(template.safeAreas),
        template.printProfileId,
        template.createdAt ?? now,
        now
      );

    return {
      ...template,
      createdAt: template.createdAt ?? now,
      updatedAt: now
    };
  }

  getBrandProfile(brandProfileId = "brand-default"): BrandProfile | null {
    const row = this.db
      .prepare("SELECT * FROM brand_profiles WHERE id = ?")
      .get(brandProfileId) as DbRow | undefined;

    if (!row) {
      return null;
    }

    return {
      id: String(row.id),
      logoAssetId: String(row.logo_asset_id),
      logoPlacement: parseJson<BrandProfile["logoPlacement"]>(row.logo_placement_json, {
        x: 20,
        y: 20,
        width: 120,
        height: 80,
        rotation: 0
      }),
      qrPlacement: parseJson<BrandProfile["qrPlacement"]>(row.qr_placement_json, {
        x: 1020,
        y: 1620,
        width: 150,
        height: 150,
        rotation: 0
      }),
      defaultTheme: String(row.default_theme)
    };
  }

  upsertBrandProfile(profile: BrandProfile): BrandProfile {
    this.db
      .prepare(
        `INSERT INTO brand_profiles (id, logo_asset_id, logo_placement_json, qr_placement_json, default_theme)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
          logo_asset_id = excluded.logo_asset_id,
          logo_placement_json = excluded.logo_placement_json,
          qr_placement_json = excluded.qr_placement_json,
          default_theme = excluded.default_theme`
      )
      .run(
        profile.id,
        profile.logoAssetId,
        JSON.stringify(profile.logoPlacement),
        JSON.stringify(profile.qrPlacement),
        profile.defaultTheme
      );

    return profile;
  }

  createShareLink(projectId: string, token: string, url: string, expiresAt: string | null = null): ShareLink {
    const share: ShareLink = {
      id: uuidv4(),
      projectId,
      publicToken: token,
      url,
      createdAt: nowIso(),
      expiresAt
    };

    this.db
      .prepare(
        `INSERT INTO share_links (id, project_id, public_token, url, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(share.id, share.projectId, share.publicToken, share.url, share.createdAt, share.expiresAt);

    return share;
  }

  getShareLinkByProject(projectId: string): ShareLink | null {
    const row = this.db
      .prepare("SELECT * FROM share_links WHERE project_id = ? ORDER BY created_at DESC LIMIT 1")
      .get(projectId) as DbRow | undefined;

    if (!row) {
      return null;
    }

    return {
      id: String(row.id),
      projectId: String(row.project_id),
      publicToken: String(row.public_token),
      url: String(row.url),
      createdAt: String(row.created_at),
      expiresAt: row.expires_at ? String(row.expires_at) : null
    };
  }

  markSessionSynced(sessionId: string): void {
    this.db.prepare("UPDATE sessions SET sync_state = 'synced' WHERE id = ?").run(sessionId);
  }

  markAssetSynced(assetId: string): void {
    this.db.prepare("UPDATE media_assets SET sync_state = 'synced' WHERE id = ?").run(assetId);
  }

  markProjectSynced(projectId: string): void {
    this.db.prepare("UPDATE edit_projects SET sync_state = 'synced' WHERE id = ?").run(projectId);
  }

  countPendingSync(): number {
    const sessions = this.db
      .prepare("SELECT COUNT(*) as count FROM sessions WHERE sync_state = 'pending'")
      .get() as { count: number };
    const media = this.db
      .prepare("SELECT COUNT(*) as count FROM media_assets WHERE sync_state = 'pending'")
      .get() as { count: number };
    const projects = this.db
      .prepare("SELECT COUNT(*) as count FROM edit_projects WHERE sync_state = 'pending'")
      .get() as { count: number };

    return Number(sessions.count) + Number(media.count) + Number(projects.count);
  }

  listPendingSessions(): Session[] {
    const rows = this.db.prepare("SELECT * FROM sessions WHERE sync_state = 'pending' ORDER BY started_at ASC").all() as DbRow[];
    return rows.map((row) => ({
      id: String(row.id),
      boothId: String(row.booth_id),
      status: row.status as Session["status"],
      startedAt: String(row.started_at),
      endedAt: row.ended_at ? String(row.ended_at) : null
    }));
  }

  listPendingAssets(): MediaAsset[] {
    const rows = this.db
      .prepare("SELECT * FROM media_assets WHERE sync_state = 'pending' ORDER BY captured_at ASC")
      .all() as DbRow[];

    return rows.map((row) => ({
      id: String(row.id),
      sessionId: String(row.session_id),
      kind: row.kind as MediaAsset["kind"],
      localPath: String(row.local_path),
      previewPath: row.preview_path ? String(row.preview_path) : null,
      capturedAt: String(row.captured_at),
      syncState: row.sync_state as MediaAsset["syncState"],
      hash: row.hash ? String(row.hash) : null
    }));
  }

  listPendingProjects(): EditProject[] {
    const rows = this.db
      .prepare("SELECT * FROM edit_projects WHERE sync_state = 'pending' AND output_path IS NOT NULL")
      .all() as DbRow[];

    return rows.map((row) => ({
      id: String(row.id),
      sessionId: String(row.session_id),
      selectedAssetIds: parseJson<string[]>(row.selected_asset_ids, []),
      filterStack: parseJson<EditProject["filterStack"]>(row.filter_stack, []),
      stickers: parseJson<EditProject["stickers"]>(row.stickers, []),
      templateId: String(row.template_id),
      renderStatus: row.render_status as EditProject["renderStatus"],
      outputPath: row.output_path ? String(row.output_path) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  close(): void {
    this.db.close();
  }
}
