// === IMPORTS ===
import { useEffect, useMemo, useState } from "react";
import { getTelegramWebApp } from "./webApp";


// === MAIN FUNCTIONS ===
export function useTelegramMiniApp() {
  const webApp = useMemo(() => getTelegramWebApp(), []);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!webApp) {
      setIsReady(true);
      return;
    }

    webApp.ready();
    webApp.expand();
    setIsReady(true);
  }, [webApp]);

  return {
    webApp,
    isReady,
    isTelegram: Boolean(webApp?.initData),
    initData: webApp?.initData ?? "",
    unsafeUser: webApp?.initDataUnsafe?.user ?? null,
    themeParams: webApp?.themeParams ?? {},
    colorScheme: webApp?.colorScheme ?? "dark",
    backButton: webApp?.BackButton ?? null,
  };
}
