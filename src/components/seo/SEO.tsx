import React from "react";
import { Helmet } from "react-helmet-async";

const SITE_URL = "https://netplex.lovable.app";
const DEFAULT_OG_IMAGE = `${SITE_URL}/favicon.png`;

interface SEOProps {
  title: string;
  description: string;
  /** Relative path like "/search" or absolute URL. Defaults to current pathname. */
  path?: string;
  ogType?: "website" | "article" | "product";
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  path,
  ogType = "website",
  ogImage,
  jsonLd,
}) => {
  const resolvedPath =
    path ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const url = resolvedPath.startsWith("http")
    ? resolvedPath
    : `${SITE_URL}${resolvedPath}`;
  const image = ogImage
    ? ogImage.startsWith("http")
      ? ogImage
      : `${SITE_URL}${ogImage}`
    : DEFAULT_OG_IMAGE;

  const jsonLdArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={image} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {jsonLdArray.map((data, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
