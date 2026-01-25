import { supabase } from "@/integrations/supabase/client";

/**
 * Get a signed URL for an image in the listings bucket.
 * Since the bucket is now private, we need signed URLs to display images.
 * 
 * @param imagePath - The path or full URL of the image
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns The signed URL or null if failed
 */
export const getSignedImageUrl = async (
  imagePath: string | null | undefined,
  expiresIn: number = 3600
): Promise<string | null> => {
  if (!imagePath) return null;
  
  try {
    // Extract the path from a full URL if needed
    let path = imagePath;
    
    // Check if it's a full Supabase storage URL
    const supabaseStoragePattern = /\/storage\/v1\/object\/(?:public|sign)\/listings\//;
    if (supabaseStoragePattern.test(imagePath)) {
      // Extract path after 'listings/'
      const match = imagePath.match(/\/listings\/(.+?)(?:\?|$)/);
      if (match) {
        path = match[1];
      }
    }
    
    // If it's already a signed URL (has token parameter), return as is
    if (imagePath.includes('token=')) {
      return imagePath;
    }
    
    // If it looks like a data URL or external URL, return as is
    if (imagePath.startsWith('data:') || 
        (!imagePath.includes('supabase') && imagePath.startsWith('http'))) {
      return imagePath;
    }
    
    const { data, error } = await supabase.storage
      .from('listings')
      .createSignedUrl(path, expiresIn);
    
    if (error) {
      console.error('Error creating signed URL:', error);
      return imagePath; // Fallback to original path
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Error in getSignedImageUrl:', error);
    return imagePath; // Fallback to original path
  }
};

/**
 * Get signed URLs for multiple images
 */
export const getSignedImageUrls = async (
  imagePaths: (string | null | undefined)[],
  expiresIn: number = 3600
): Promise<string[]> => {
  const urls = await Promise.all(
    imagePaths.map(path => getSignedImageUrl(path, expiresIn))
  );
  return urls.filter((url): url is string => url !== null);
};

/**
 * Extract storage path from a full URL for storing in database
 */
export const getStoragePath = (fullUrl: string): string => {
  const match = fullUrl.match(/\/listings\/(.+?)(?:\?|$)/);
  return match ? match[1] : fullUrl;
};
