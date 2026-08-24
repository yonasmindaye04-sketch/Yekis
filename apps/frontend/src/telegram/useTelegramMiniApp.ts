// === IMPORTS ===
import { useEffect, useMemo, useState } from "react";
import { getTelegramWebApp, isTelegramMiniApp } from "./webApp";

// === MAIN FUNCTIONS ===
export function useTelegramMiniApp() {
  const webApp = useMemo(() => getTelegramWebApp(), []);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!webApp) {
      setIsReady(true);
      return;
    }

    try {
      webApp.ready();
      webApp.expand();
    } catch {
      // ignore
    }
    setIsReady(true);
  }, [webApp]);

  const isTelegram = isTelegramMiniApp();

  return {
    webApp,
    isReady,
    isTelegram,
    initData: webApp?.initData ?? "",
    unsafeUser: webApp?.initDataUnsafe?.user ?? null,
    themeParams: webApp?.themeParams ?? {},
    colorScheme: webApp?.colorScheme ?? "dark",
    backButton: webApp?.BackButton ?? null,
  };
}
