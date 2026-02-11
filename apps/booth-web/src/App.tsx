import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { GalleryPage } from "./pages/GalleryPage";
import { EditorPage } from "./pages/EditorPage";
import { OperatorPage } from "./pages/OperatorPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/session/:sessionId" element={<GalleryPage />} />
      <Route path="/editor/:projectId" element={<EditorPage />} />
      <Route path="/operator" element={<OperatorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
