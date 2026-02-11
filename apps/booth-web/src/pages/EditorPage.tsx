import { useEffect, useMemo, useState } from "react";
import { Image as KonvaImage, Layer, Rect, Stage, Text } from "react-konva";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  createPrintJob,
  getProject,
  getPrintJob,
  listSessionMedia,
  localFileUrl,
  renderProject,
  updateProject,
  triggerSync
} from "../api/localAgent";

function useImage(src: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
  }, [src]);

  return image;
}

export function EditorPage() {
  const navigate = useNavigate();
  const { projectId = "" } = useParams();

  const [filterIntensity, setFilterIntensity] = useState(0.6);
  const [includeSticker, setIncludeSticker] = useState(true);
  const [copies, setCopies] = useState(1);
  const [renderResultPath, setRenderResultPath] = useState<string | null>(null);

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId)
  });

  const sessionId = projectQuery.data?.sessionId ?? "";
  const mediaQuery = useQuery({
    queryKey: ["project-media", sessionId],
    queryFn: () => listSessionMedia(sessionId),
    enabled: Boolean(sessionId)
  });

  const selectedAsset = useMemo(() => {
    if (!projectQuery.data || !mediaQuery.data) {
      return null;
    }

    return mediaQuery.data.find((asset) => asset.id === projectQuery.data?.selectedAssetIds[0]) ?? null;
  }, [mediaQuery.data, projectQuery.data]);

  const selectedImageUrl = localFileUrl(selectedAsset?.previewPath ?? selectedAsset?.localPath ?? null);
  const selectedImage = useImage(selectedImageUrl);

  const renderMutation = useMutation({
    mutationFn: async () => {
      await updateProject(projectId, {
        filterStack: [
          { id: "vivid", intensity: filterIntensity * 0.5 },
          { id: "contrast", intensity: filterIntensity }
        ],
        stickers: includeSticker
          ? [
              {
                id: "sticker-brand",
                assetPath: "brand/logo.png",
                x: 52,
                y: 640,
                width: 140,
                height: 40,
                rotation: 0
              }
            ]
          : []
      });

      const response = await renderProject(projectId, {
        brandProfileId: "brand-default",
        qrTargetUrl: "http://127.0.0.1:3000/public/p"
      });
      setRenderResultPath(response.outputPath);
      return response;
    }
  });

  const printMutation = useMutation({
    mutationFn: () => createPrintJob(projectId, copies, "print-4x6-300dpi")
  });

  const printStatusQuery = useQuery({
    queryKey: ["print-job", printMutation.data?.id],
    queryFn: () => getPrintJob(printMutation.data!.id),
    enabled: Boolean(printMutation.data?.id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ["printed", "failed"].includes(status) ? false : 1000;
    }
  });

  const syncMutation = useMutation({
    mutationFn: triggerSync
  });

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="badge">Project {projectId.slice(0, 8)}</p>
          <h1>Edit and Finalize</h1>
          <p>Preview filters/stickers before authoritative local-agent render.</p>
        </div>
        <div className="header-actions">
          <button type="button" className="secondary" onClick={() => navigate(`/session/${sessionId}`)}>
            Back to Gallery
          </button>
        </div>
      </header>

      <div className="panel-grid">
        <article className="panel canvas-panel">
          <h2>Live Preview Canvas</h2>
          <Stage width={520} height={760} className="editor-canvas">
            <Layer>
              <Rect x={0} y={0} width={520} height={760} fill="#f8f6ef" />
              {selectedImage ? <KonvaImage image={selectedImage} x={20} y={70} width={480} height={620} /> : null}
              <Rect
                x={40}
                y={640}
                width={160}
                height={44}
                fill="#14213d"
                cornerRadius={8}
                opacity={Math.min(1, Math.max(0.2, filterIntensity))}
              />
              <Text x={56} y={654} text="Brand Logo" fill="#ffffff" fontSize={16} />
              <Rect x={400} y={640} width={80} height={80} stroke="#111" strokeWidth={4} />
              <Text x={407} y={670} text="QR" fill="#111" fontSize={20} />
            </Layer>
          </Stage>

          <label>
            Filter Intensity ({filterIntensity.toFixed(2)})
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={filterIntensity}
              onChange={(event) => setFilterIntensity(Number(event.target.value))}
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={includeSticker}
              onChange={(event) => setIncludeSticker(event.target.checked)}
            />
            Include Brand Sticker
          </label>
        </article>

        <article className="panel side-panel">
          <h2>Finalize</h2>
          <button type="button" className="primary" onClick={() => renderMutation.mutate()} disabled={renderMutation.isPending}>
            {renderMutation.isPending ? "Rendering..." : "Render Final Output"}
          </button>

          {renderMutation.data ? (
            <div className="result-box">
              <p>Render complete.</p>
              <p className="muted">Share URL: {renderMutation.data.shareUrl}</p>
              {renderResultPath ? (
                <img src={localFileUrl(renderResultPath) ?? undefined} alt="Rendered output" className="render-preview" />
              ) : null}
            </div>
          ) : null}

          <label>
            Copies
            <input
              type="number"
              min={1}
              max={10}
              value={copies}
              onChange={(event) => setCopies(Number(event.target.value))}
            />
          </label>

          <button
            type="button"
            className="primary"
            disabled={!renderMutation.data || printMutation.isPending}
            onClick={() => printMutation.mutate()}
          >
            {printMutation.isPending ? "Queueing..." : "Print"}
          </button>

          {printStatusQuery.data ? (
            <p className="muted">Print status: {printStatusQuery.data.status}</p>
          ) : null}

          <button type="button" className="secondary" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            {syncMutation.isPending ? "Syncing..." : "Sync to Cloud"}
          </button>

          {syncMutation.data ? (
            <p className="muted">
              Synced sessions: {syncMutation.data.sessionsSynced}, assets: {syncMutation.data.assetsSynced}, finals: {syncMutation.data.finalsSynced}
            </p>
          ) : null}
        </article>
      </div>
    </section>
  );
}
