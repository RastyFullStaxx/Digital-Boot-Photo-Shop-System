import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createSession, getActiveSession, getHealth } from "../api/localAgent";

export function HomePage() {
  const navigate = useNavigate();

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    refetchInterval: 5000
  });

  const activeSessionQuery = useQuery({
    queryKey: ["active-session"],
    queryFn: getActiveSession,
    refetchInterval: 3000
  });

  const createSessionMutation = useMutation({
    mutationFn: () => createSession("booth-001"),
    onSuccess: (session) => navigate(`/session/${session.id}`)
  });

  const activeSession = activeSessionQuery.data;

  return (
    <section className="page">
      <header className="hero">
        <p className="badge">Offline-First Booth</p>
        <h1>Digital Boot Photobooth</h1>
        <p>
          Capture, choose, edit, collage, print, and sync customer photos with secure QR delivery.
        </p>
      </header>

      <div className="panel-grid">
        <article className="panel">
          <h2>Booth Control</h2>
          <button
            type="button"
            className="primary"
            onClick={() => createSessionMutation.mutate()}
            disabled={createSessionMutation.isPending}
          >
            {createSessionMutation.isPending ? "Starting..." : "Start New Session"}
          </button>

          {activeSession ? (
            <button type="button" className="secondary" onClick={() => navigate(`/session/${activeSession.id}`)}>
              Resume Active Session
            </button>
          ) : (
            <p className="muted">No active session currently.</p>
          )}
        </article>

        <article className="panel">
          <h2>Agent Health</h2>
          {healthQuery.isLoading ? <p>Checking health...</p> : null}
          {healthQuery.data ? (
            <ul className="metrics">
              <li>
                <span>Status</span>
                <strong>{healthQuery.data.ok ? "Healthy" : "Down"}</strong>
              </li>
              <li>
                <span>Pending Sync</span>
                <strong>{healthQuery.data.pendingSyncCount}</strong>
              </li>
              <li>
                <span>Watched Folder</span>
                <strong>{healthQuery.data.watchedDirectory}</strong>
              </li>
            </ul>
          ) : null}
        </article>
      </div>
    </section>
  );
}
