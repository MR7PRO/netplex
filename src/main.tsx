import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Remove initial loader when React mounts
const loader = document.getElementById("initial-loader");
if (loader) {
  loader.style.opacity = "0";
  loader.style.transition = "opacity 0.2s";
  setTimeout(() => loader.remove(), 200);
}

createRoot(document.getElementById("root")!).render(<App />);
