import { useEffect, useState } from "react";
import MainRoutes from "./Routes";


export default function App() {
  const [previewSrc, setPreviewSrc] = useState("");

  useEffect(() => {
    const onImageClick = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;
      if (!target.closest(".description-view")) return;
      setPreviewSrc(target.src || "");
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") setPreviewSrc("");
    };

    document.addEventListener("click", onImageClick);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("click", onImageClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <>
      <MainRoutes />

      {previewSrc && (
        <div
          className="fixed inset-0 z-[9999] bg-black/75 flex items-center justify-center p-4"
          onClick={() => setPreviewSrc("")}
        >
          <img
            src={previewSrc}
            alt="Preview"
            className="max-w-[95vw] max-h-[90vh] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
