export default function AdminPage() {
  return (
    <main className="main">
      <h1>Admin Overview</h1>
      <p className="muted">
        This page provides API usage references for admin operations. Integrate it with a full RBAC UI in the next phase.
      </p>

      <div className="grid">
        <section className="card">
          <h2>Required Header</h2>
          <p>
            Use <code>x-admin-token: &lt;ADMIN_API_TOKEN&gt;</code> for `/api/v1/admin/*` routes.
          </p>
        </section>

        <section className="card">
          <h2>Available Endpoints</h2>
          <ul>
            <li>
              <code>GET /api/v1/admin/sessions?page=1&pageSize=20</code>
            </li>
            <li>
              <code>GET|POST /api/v1/admin/templates</code>
            </li>
            <li>
              <code>GET|POST /api/v1/admin/branding</code>
            </li>
            <li>
              <code>POST /api/v1/admin/retention/run</code>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
