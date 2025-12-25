import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useZoom } from "@/hooks/useZoom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Simple fallback translations for zoom controls
const zoomLabels = {
  in: "Zoom in",
  out: "Zoom out",
  reset: "Reset to 100%"
};

export function ZoomControls() {
  const { zoomLevel, zoomIn, zoomOut, resetZoom } = useZoom();
  const percentage = Math.round(zoomLevel * 100);

  return (
    <TooltipProvider>
      <div
        className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full border border-border bg-background/95 p-1 shadow-lg backdrop-blur-sm"
        role="group"
        aria-label="Zoom controls"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={zoomOut}
              disabled={zoomLevel <= 0.75}
              aria-label={zoomLabels.out}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{zoomLabels.out}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 min-w-[3rem] rounded-full px-2 text-xs font-medium"
              onClick={resetZoom}
              aria-label={zoomLabels.reset}
            >
              {percentage}%
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{zoomLabels.reset}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={zoomIn}
              disabled={zoomLevel >= 1.5}
              aria-label={zoomLabels.in}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{zoomLabels.in}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
