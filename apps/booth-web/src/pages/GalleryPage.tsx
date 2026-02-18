import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { completeSession, createProject, listSessionMedia, listTemplates } from "../api/localAgent";
import { MediaGrid } from "../components/MediaGrid";
import { useSessionStore } from "../store/useSessionStore";

export function GalleryPage() {
  const navigate = useNavigate();
  const { sessionId = "" } = useParams();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("tmpl-4x6-classic");

  const selectedAssetIds = useSessionStore((state) => state.selectedAssetIdsBySession[sessionId] ?? []);
  const toggleAsset = useSessionStore((state) => state.toggleAsset);
  const setLastProjectId = useSessionStore((state) => state.setLastProjectId);

  const mediaQuery = useQuery({
    queryKey: ["session-media", sessionId],
    queryFn: () => listSessionMedia(sessionId),
    enabled: Boolean(sessionId),
    refetchInterval: 2000
  });

  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: listTemplates
  });

  const selectedPhotoIds = useMemo(() => {
    if (!mediaQuery.data) {
      return [];
    }

    return mediaQuery.data.filter((asset) => selectedAssetIds.includes(asset.id) && asset.kind === "photo").map((asset) => asset.id);
  }, [mediaQuery.data, selectedAssetIds]);

  const createProjectMutation = useMutation({
    mutationFn: () =>
      createProject({
        sessionId,
        selectedAssetIds: selectedPhotoIds,
        templateId: selectedTemplateId,
        filterStack: [],
        stickers: []
      }),
    onSuccess: (project) => {
      setLastProjectId(project.id);
      navigate(`/editor/${project.id}`);
    }
  });

  const completeSessionMutation = useMutation({
    mutationFn: () => completeSession(sessionId),
    onSuccess: () => navigate("/")
  });

  const mediaCount = mediaQuery.data?.length ?? 0;

  const selectedTemplateName = useMemo(() => {
    return templatesQuery.data?.find((template) => template.id === selectedTemplateId)?.name ?? "";
  }, [templatesQuery.data, selectedTemplateId]);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="badge">Session {sessionId.slice(0, 8)}</p>
          <h1>Guest Gallery</h1>
          <p>Select the best photos/videos before editing and print composition.</p>
          <div className="stepper">
            <span className="step active">
              <span className="dot" /> Capture
            </span>
            <span className="step active">
              <span className="dot" /> Select
            </span>
            <span className="step">
              <span className="dot" /> Edit
            </span>
            <span className="step">
              <span className="dot" /> Render
            </span>
            <span className="step">
              <span className="dot" /> Print
            </span>
            <span className="step">
              <span className="dot" /> Sync
            </span>
          </div>
        </div>
        <div className="header-actions">
          <Link className="secondary" to="/operator">
            Operator
          </Link>
          <button
            type="button"
            className="secondary"
            onClick={() => completeSessionMutation.mutate()}
            disabled={completeSessionMutation.isPending}
          >
            End Session
          </button>
        </div>
      </header>

      <div className="panel-grid">
        <article className="panel">
          <h2>Capture Feed</h2>
          <p className="muted">Watching tether folder for new media files.</p>
          <p>
            <strong>{mediaCount}</strong> assets detected
          </p>
          {mediaQuery.isLoading ? (
            <div className="skeleton-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="skeleton-card" key={`skeleton-${index}`} />
              ))}
            </div>
          ) : mediaQuery.data ? (
            <MediaGrid media={mediaQuery.data} selectedAssetIds={selectedAssetIds} onToggle={(id) => toggleAsset(sessionId, id)} />
          ) : (
            <p>Loading media...</p>
          )}
        </article>

        <article className="panel side-panel">
          <h2>Project Setup</h2>
          <label>
            Template
            <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
              {templatesQuery.data?.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <p className="muted">Selected: {selectedTemplateName || "-"}</p>
          <p className="muted">Chosen media: {selectedAssetIds.length}</p>
          <p className="muted">Photos eligible for print: {selectedPhotoIds.length}</p>
          <p className="muted">Videos remain digital-only and are excluded from print render.</p>
          <button
            type="button"
            className="primary"
            disabled={selectedPhotoIds.length === 0 || createProjectMutation.isPending}
            onClick={() => createProjectMutation.mutate()}
          >
            {createProjectMutation.isPending ? "Creating..." : "Create Edit Project"}
          </button>
        </article>
      </div>
    </section>
  );
}
