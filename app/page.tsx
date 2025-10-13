"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to text-to-image page by default
    router.push("/text-to-image");
  }, [router]);

  return null;
}

