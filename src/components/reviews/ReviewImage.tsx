import React from "react";
import { useSignedImageUrl } from "@/hooks/useSignedImageUrl";

interface Props {
  path: string;
  onClick?: () => void;
}

export const ReviewImage: React.FC<Props> = ({ path, onClick }) => {
  const { signedUrl } = useSignedImageUrl(path);
  if (!signedUrl) return <div className="w-16 h-16 rounded bg-muted animate-pulse" />;
  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => { if (onClick) { e.preventDefault(); onClick(); } }}
      className="block w-16 h-16 rounded overflow-hidden border hover:opacity-80 transition"
    >
      <img src={signedUrl} alt="مرفق المراجعة" className="w-full h-full object-cover" loading="lazy" />
    </a>
  );
};

export default ReviewImage;
