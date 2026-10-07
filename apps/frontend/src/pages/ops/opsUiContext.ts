/* ────────────────────────────────────────────────────────────────────────
   opsUiContext.ts — shell-level services handed to every ops page:
   navigation (custom string router), evidence viewer, palette state,
   toasts and sidebar-badge refresh. Provided by OpsConsole.tsx.
   ──────────────────────────────────────────────────────────────────────── */

import { createContext, useContext } from "react";
import type { OpsPageId } from "./opsNav";
import type { ViewerDoc } from "./components/EvidenceViewer";

export interface OpsAccount {
  id: string;
  email: string;
  staffRole: string | null;
  /** Human label for the staff role, e.g. "Compliance Officer". */
  roleLabel: string;
}

export interface OpsUiApi {
  /** custom-router navigation; focusId deep-links a record into the page */
  navigate: (page: OpsPageId, focusId?: string) => void;
  openViewer: (docs: ViewerDoc[], startIdx?: number) => void;
  viewerOpen: boolean;
  paletteOpen: boolean;
  toast: (msg: string) => void;
  refreshBadges: () => void;
  /** The signed-in staff member, for pages that edit their own account. */
  account: OpsAccount | null;
  /** Whether the current role may open a page — shared so consumers do not
   *  each fetch the permission matrix. */
  can: (page: OpsPageId) => boolean;
  /** Human name of a page, for labels such as a notification's destination. */
  pageLabel: (page: OpsPageId) => string;
}

export const OpsUiContext = createContext<OpsUiApi>({
  navigate: () => {},
  openViewer: () => {},
  viewerOpen: false,
  paletteOpen: false,
  toast: () => {},
  refreshBadges: () => {},
  account: null,
  can: () => false,
  pageLabel: (page) => page,
});

export const useOpsUi = () => useContext(OpsUiContext);
