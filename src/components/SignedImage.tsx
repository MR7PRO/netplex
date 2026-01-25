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
}

/**
 * A component that displays images from the private storage bucket
 * using signed URLs for secure access.
 */
export const SignedImage: React.FC<SignedImageProps> = ({
  src,
  alt,
  className,
  fallback,
  showSkeleton = true,
}) => {
  const { signedUrl, loading } = useSignedImageUrl(src);

  if (loading && showSkeleton) {
    return <Skeleton className={cn("h-full w-full", className)} />;
  }

  if (!signedUrl) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
    />
  );
};

export default SignedImage;
