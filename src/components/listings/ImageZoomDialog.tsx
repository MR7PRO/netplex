import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageZoomDialogProps {
  images: string[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImageZoomDialog: React.FC<ImageZoomDialogProps> = ({
  images,
  initialIndex,
  open,
  onOpenChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);

  const goNext = () => setCurrentIndex((i) => (i + 1) % images.length);
  const goPrev = () => setCurrentIndex((i) => (i - 1 + images.length) % images.length);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoomed(false);
    }
  }, [open, initialIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-black/95 overflow-hidden">
        <div className="relative flex items-center justify-center w-full h-[90vh]">
          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 z-10 text-white hover:bg-white/20"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Zoom toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 left-3 z-10 text-white hover:bg-white/20"
            onClick={() => setZoomed(!zoomed)}
          >
            {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
          </Button>

          {/* Navigation */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12"
                onClick={goPrev}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12"
                onClick={goNext}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            </>
          )}

          {/* Image */}
          <div className={cn("overflow-auto w-full h-full flex items-center justify-center", zoomed && "cursor-zoom-out")} onClick={() => zoomed && setZoomed(false)}>
            <img
              src={images[currentIndex]}
              alt=""
              className={cn(
                "transition-transform duration-300 select-none",
                zoomed ? "max-w-none scale-150 cursor-zoom-out" : "max-h-[85vh] max-w-full object-contain cursor-zoom-in"
              )}
              onClick={(e) => {
                e.stopPropagation();
                setZoomed(!zoomed);
              }}
              draggable={false}
            />
          </div>

          {/* Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
