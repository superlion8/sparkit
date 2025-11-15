import Script from "next/script";

export default function StructuredData() {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Sparkit",
    "description": "AI 驱动的创意工具包，提供强大的图像生成、视频制作和创意工具",
    "url": process.env.NEXT_PUBLIC_SITE_URL || "https://creator-ai-toolkit.vercel.app",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "CNY"
    },
    "featureList": [
      "AI图像生成",
      "AI视频生成",
      "文生图",
      "图像编辑",
      "Mimic角色替换",
      "PhotoBooth组图",
      "Snapshot",
      "Photo to Live",
      "视频生成",
      "AI换装",
      "AI换背景"
    ]
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Sparkit",
    "url": process.env.NEXT_PUBLIC_SITE_URL || "https://creator-ai-toolkit.vercel.app",
    "logo": `${process.env.NEXT_PUBLIC_SITE_URL || "https://creator-ai-toolkit.vercel.app"}/sparkit.png`,
    "description": "AI 驱动的创意工具包"
  };

  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Sparkit",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web",
    "description": "强大的 AI 图像生成、视频制作和创意工具",
    "url": process.env.NEXT_PUBLIC_SITE_URL || "https://creator-ai-toolkit.vercel.app",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "CNY"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "100"
    }
  };

  return (
    <>
      <Script
        id="website-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <Script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <Script
        id="software-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />
    </>
  );
}

