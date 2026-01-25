import { useState, useEffect } from 'react';
import { getSignedImageUrl, getSignedImageUrls } from '@/lib/storage';

/**
 * Hook to get a signed URL for a single image
 */
export const useSignedImageUrl = (imagePath: string | null | undefined) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchSignedUrl = async () => {
      if (!imagePath) {
        setSignedUrl(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const url = await getSignedImageUrl(imagePath);
      
      if (isMounted) {
        setSignedUrl(url);
        setLoading(false);
      }
    };

    fetchSignedUrl();

    return () => {
      isMounted = false;
    };
  }, [imagePath]);

  return { signedUrl, loading };
};

/**
 * Hook to get signed URLs for multiple images
 */
export const useSignedImageUrls = (imagePaths: (string | null | undefined)[] | undefined) => {
  const [signedUrls, setSignedUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchSignedUrls = async () => {
      if (!imagePaths || imagePaths.length === 0) {
        setSignedUrls([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const urls = await getSignedImageUrls(imagePaths);
      
      if (isMounted) {
        setSignedUrls(urls);
        setLoading(false);
      }
    };

    fetchSignedUrls();

    return () => {
      isMounted = false;
    };
  }, [JSON.stringify(imagePaths)]); // Stringify to detect array content changes

  return { signedUrls, loading };
};
