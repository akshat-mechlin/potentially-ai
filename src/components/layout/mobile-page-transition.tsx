"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useMobileApp } from "@/hooks/use-mobile-app";

const ease = [0.32, 0.72, 0, 1] as const;

export function MobilePageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isMobileApp } = useMobileApp();

  if (!isMobileApp) {
    return <>{children}</>;
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease }}
      className="flex min-h-0 flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}
