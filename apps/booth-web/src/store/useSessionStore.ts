import { create } from "zustand";

interface SessionState {
  selectedAssetIdsBySession: Record<string, string[]>;
  lastProjectId: string | null;
  setSelection: (sessionId: string, selectedAssetIds: string[]) => void;
  toggleAsset: (sessionId: string, assetId: string) => void;
  setLastProjectId: (projectId: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  selectedAssetIdsBySession: {},
  lastProjectId: null,
  setSelection: (sessionId, selectedAssetIds) =>
    set((state) => ({
      selectedAssetIdsBySession: {
        ...state.selectedAssetIdsBySession,
        [sessionId]: selectedAssetIds
      }
    })),
  toggleAsset: (sessionId, assetId) =>
    set((state) => {
      const current = state.selectedAssetIdsBySession[sessionId] ?? [];
      const next = current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId];

      return {
        selectedAssetIdsBySession: {
          ...state.selectedAssetIdsBySession,
          [sessionId]: next
        }
      };
    }),
  setLastProjectId: (projectId) => set({ lastProjectId: projectId })
}));
