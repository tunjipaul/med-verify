import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App.tsx";
import { QueryProvider } from "./providers/QueryProvider";
import "./index.css";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <BrowserRouter>
        <App />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </QueryProvider>
  </StrictMode>,
)
