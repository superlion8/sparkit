"use client";

import type { PropsWithChildren } from "react";
import AuthProvider from "@/components/AuthProvider";

export function Providers({ children }: PropsWithChildren) {
  return <AuthProvider>{children}</AuthProvider>;
}
