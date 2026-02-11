import Link from "next/link";

export default function HomePage() {
  return (
    <main className="main">
      <h1>Digital Boot Cloud Web</h1>
      <p className="muted">Cloud API surface for sync, admin operations, and QR public pages.</p>

      <div className="grid">
        <section className="card">
          <h2>Public Pages</h2>
          <p>Guests open secure token links generated at the booth.</p>
          <p>
            Example: <code>/public/p/&lt;token&gt;</code>
          </p>
        </section>

        <section className="card">
          <h2>Admin</h2>
          <p>Manage templates, branding, retention, and session visibility.</p>
          <Link href="/admin">Go to Admin Overview</Link>
        </section>
      </div>
    </main>
  );
}
