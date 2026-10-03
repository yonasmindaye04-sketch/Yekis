/* ────────────────────────────────────────────────────────────────────────
   opsUiContext.ts — shell-level services handed to every ops page:
   navigation (custom string router), evidence viewer, palette state,
   toasts and sidebar-badge refresh. Provided by OpsConsole.tsx.
   ──────────────────────────────────────────────────────────────────────── */

import { createContext, useContext } from "react";
import type { OpsPageId } from "./opsNav";
import type { ViewerDoc } from "./components/EvidenceViewer";

export interface OpsUiApi {
  /** custom-router navigation; focusId deep-links a record into the page */
  navigate: (page: OpsPageId, focusId?: string) => void;
  openViewer: (docs: ViewerDoc[], startIdx?: number) => void;
  viewerOpen: boolean;
  paletteOpen: boolean;
  toast: (msg: string) => void;
  refreshBadges: () => void;
}

export const OpsUiContext = createContext<OpsUiApi>({
  navigate: () => {},
  openViewer: () => {},
  viewerOpen: false,
  paletteOpen: false,
  toast: () => {},
  refreshBadges: () => {},
});

export const useOpsUi = () => useContext(OpsUiContext);
