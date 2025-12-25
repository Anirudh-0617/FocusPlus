import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ZoomContextType {
  zoomLevel: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

const ZoomContext = createContext<ZoomContextType | undefined>(undefined);

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;

export function ZoomProvider({ children }: { children: ReactNode }) {
  const [zoomLevel, setZoomLevel] = useState(() => {
    if (typeof window === "undefined") return 1;
    const saved = window.localStorage.getItem("focusplus-zoom");
    const raw = saved ? parseFloat(saved) : 1;
    if (Number.isNaN(raw) || raw <= 0) return 1;
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, raw));
  });

  useEffect(() => {
    localStorage.setItem("focusplus-zoom", zoomLevel.toString());
    document.documentElement.style.fontSize = `${zoomLevel * 100}%`;
  }, [zoomLevel]);

  const zoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };

  const zoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  };

  const resetZoom = () => {
    setZoomLevel(1);
  };

  return (
    <ZoomContext.Provider value={{ zoomLevel, zoomIn, zoomOut, resetZoom }}>
      {children}
    </ZoomContext.Provider>
  );
}

export function useZoom() {
  const context = useContext(ZoomContext);
  if (!context) {
    throw new Error("useZoom must be used within a ZoomProvider");
  }
  return context;
}
