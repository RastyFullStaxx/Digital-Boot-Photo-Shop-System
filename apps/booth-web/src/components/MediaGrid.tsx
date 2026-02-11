import type { MediaAsset } from "../types/api";
import { localFileUrl } from "../api/localAgent";

interface MediaGridProps {
  media: MediaAsset[];
  selectedAssetIds: string[];
  onToggle: (assetId: string) => void;
}

export function MediaGrid({ media, selectedAssetIds, onToggle }: MediaGridProps) {
  return (
    <div className="media-grid">
      {media.map((asset) => {
        const selected = selectedAssetIds.includes(asset.id);
        const preview = localFileUrl(asset.previewPath) ?? localFileUrl(asset.localPath);

        return (
          <button
            key={asset.id}
            type="button"
            className={`media-card ${selected ? "selected" : ""}`}
            onClick={() => onToggle(asset.id)}
          >
            <div className="media-thumb">
              {preview ? (
                asset.kind === "video" ? (
                  <video src={preview} muted playsInline preload="metadata" />
                ) : (
                  <img src={preview} alt={`Asset ${asset.id}`} loading="lazy" />
                )
              ) : (
                <span>No preview</span>
              )}
            </div>
            <div className="media-meta">
              <span>{asset.kind.toUpperCase()}</span>
              <span>{new Date(asset.capturedAt).toLocaleTimeString()}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
