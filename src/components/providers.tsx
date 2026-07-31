"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode, useEffect } from "react";
import { UploadThingProvider } from "@/lib/uploadthing-provider";
import { SettingsProvider } from "@/lib/contexts/settings-context";
import { GamificationProvider } from "@/lib/contexts/gamification-context";
import { PWAInstallPrompt, registerSW } from "@/components/pwa-install";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    registerSW();
  }, []);

  return (
    <SessionProvider>
      <SettingsProvider>
        <GamificationProvider>
          <UploadThingProvider>
            {children}
            <PWAInstallPrompt />
          </UploadThingProvider>
        </GamificationProvider>
      </SettingsProvider>
    </SessionProvider>
  );
}
