import { notFound } from "next/navigation";
import { getFinalByToken } from "../../../../lib/store";

interface SharePageProps {
  params: { token: string };
}

export default function SharePage({ params }: SharePageProps) {
  const { token } = params;
  const finalRecord = getFinalByToken(token);

  if (!finalRecord) {
    notFound();
  }

  return (
    <main className="main">
      <h1>Your Photobooth Output</h1>
      <p className="muted">Project {finalRecord.projectId}</p>

      <section className="card">
        <p>
          The booth has published your final output. For production, serve this image from object storage and provide
          download controls.
        </p>
        {finalRecord.imageBase64 ? (
          <img
            src={`data:image/jpeg;base64,${finalRecord.imageBase64}`}
            alt="Photobooth final output"
            style={{ maxWidth: "100%", borderRadius: 12, border: "1px solid #d4dde8", marginBottom: 16 }}
          />
        ) : null}
        <ul>
          <li>
            <strong>Session:</strong> {finalRecord.sessionId}
          </li>
          <li>
            <strong>Published:</strong> {new Date(finalRecord.createdAt).toLocaleString()}
          </li>
          <li>
            <strong>Source Path:</strong> <code>{finalRecord.outputPath}</code>
          </li>
        </ul>
      </section>
    </main>
  );
}
