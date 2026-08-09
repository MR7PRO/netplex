import React from "react";
import { useSignedImageUrl } from "@/hooks/useSignedImageUrl";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SignedImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  showSkeleton?: boolean;
  /** Intrinsic size hints to reserve space and prevent layout shift (CLS) */
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
}

/**
 * A component that displays images from the private storage bucket
 * using signed URLs for secure access.
 *
 * Reserves space via width/height + aspect-ratio and shows a blurred
 * placeholder that cross-fades into the loaded image (prevents CLS).
 */
export const SignedImage: React.FC<SignedImageProps> = ({
  src,
  alt,
  className,
  fallback,
  showSkeleton = true,
  width = 800,
  height = 800,
  loading = "lazy",
}) => {
  const { signedUrl, loading: urlLoading } = useSignedImageUrl(src);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    setLoaded(false);
  }, [signedUrl]);

  if (urlLoading && showSkeleton) {
    return <Skeleton className={cn("h-full w-full", className)} />;
  }

  if (!signedUrl) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <span
      className="relative block h-full w-full overflow-hidden"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {!loaded && (
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-muted animate-pulse blur-[2px]"
        />
      )}
      <img
        src={signedUrl}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={cn(
          "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
      />
    </span>
  );
};

export default SignedImage;
