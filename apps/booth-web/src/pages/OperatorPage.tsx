import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getHealth, triggerSync } from "../api/localAgent";

export function OperatorPage() {
  const healthQuery = useQuery({
    queryKey: ["health", "operator"],
    queryFn: getHealth,
    refetchInterval: 3000
  });

  const syncMutation = useMutation({
    mutationFn: triggerSync
  });

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="badge">Operator Console</p>
          <h1>Booth Status</h1>
          <p>Monitor local services and force sync when internet resumes.</p>
        </div>
        <div className="header-actions">
          <Link className="secondary" to="/">
            Home
          </Link>
        </div>
      </header>

      <div className="panel-grid">
        <article className="panel">
          <h2>Agent Health</h2>
          {healthQuery.data ? (
            <ul className="metrics">
              <li>
                <span>Status</span>
                <strong>{healthQuery.data.ok ? "Healthy" : "Error"}</strong>
              </li>
              <li>
                <span>Pending Sync</span>
                <strong>{healthQuery.data.pendingSyncCount}</strong>
              </li>
              <li>
                <span>Uptime</span>
                <strong>{healthQuery.data.uptimeSeconds}s</strong>
              </li>
              <li>
                <span>Watcher</span>
                <strong>{healthQuery.data.watchedDirectory}</strong>
              </li>
            </ul>
          ) : (
            <p>Loading health...</p>
          )}
        </article>

        <article className="panel">
          <h2>Manual Sync</h2>
          <button type="button" className="primary" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            {syncMutation.isPending ? "Running sync..." : "Run Sync"}
          </button>
          {syncMutation.data ? (
            <ul className="metrics">
              <li>
                <span>Sessions</span>
                <strong>{syncMutation.data.sessionsSynced}</strong>
              </li>
              <li>
                <span>Assets</span>
                <strong>{syncMutation.data.assetsSynced}</strong>
              </li>
              <li>
                <span>Finals</span>
                <strong>{syncMutation.data.finalsSynced}</strong>
              </li>
              <li>
                <span>Failures</span>
                <strong>{syncMutation.data.failures}</strong>
              </li>
            </ul>
          ) : null}
        </article>
      </div>
    </section>
  );
}
