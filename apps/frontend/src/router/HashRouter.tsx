import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface HashLocationState {
  showProfileCompletion?: boolean;
  fromFirstLogin?: boolean;
  missingFields?: Array<"photo" | "bio" | "skills">;
  [key: string]: unknown;
}

export interface HashLocation<S = HashLocationState | null> {
  pathname: string;
  search: string;
  hash: string;
  state: S;
  key: string;
}

export interface NavigateOptions {
  replace?: boolean;
  state?: HashLocationState | null;
}

export type NavigateFunction = (
  to: string | number,
  options?: NavigateOptions,
) => void;

interface HashRouterContextValue {
  location: HashLocation<HashLocationState | null>;
  navigate: NavigateFunction;
}

const HashRouterContext = createContext<HashRouterContextValue | null>(null);

function parseHashUrl(): { pathname: string; search: string; hash: string } {
  if (typeof window === "undefined") {
    return { pathname: "/", search: "", hash: "" };
  }
  const rawHash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  if (!rawHash) {
    return { pathname: "/", search: "", hash: "" };
  }

  const qIndex = rawHash.indexOf("?");
  if (qIndex === -1) {
    const pathname = rawHash.startsWith("/") ? rawHash : `/${rawHash}`;
    return { pathname, search: "", hash: "" };
  }

  const rawPath = rawHash.slice(0, qIndex);
  const pathname = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const search = rawHash.slice(qIndex);
  return { pathname, search, hash: "" };
}

function readHistoryUserState(): HashLocationState | null {
  if (typeof window === "undefined") return null;
  try {
    const histState = window.history.state;
    if (histState && typeof histState === "object" && "usr" in histState) {
      return (histState.usr as HashLocationState) ?? null;
    }
    if (histState && typeof histState === "object") {
      return histState as HashLocationState;
    }
  } catch {
    // ignore history access errors
  }
  return null;
}

export function HashRouter({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<HashLocation<HashLocationState | null>>(
    () => ({
      ...parseHashUrl(),
      state: readHistoryUserState(),
      key: "initial",
    }),
  );

  useEffect(() => {
    const syncFromWindow = () => {
      const parsed = parseHashUrl();
      const usrState = readHistoryUserState();
      setLocation((prev) => ({
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash,
        state: usrState ?? prev.state,
        key: `${Date.now().toString(36)}`,
      }));
    };

    window.addEventListener("hashchange", syncFromWindow);
    window.addEventListener("popstate", syncFromWindow);
    return () => {
      window.removeEventListener("hashchange", syncFromWindow);
      window.removeEventListener("popstate", syncFromWindow);
    };
  }, []);

  const navigate = useCallback<NavigateFunction>((to, options) => {
    if (typeof window === "undefined") return;
    if (typeof to === "number") {
      window.history.go(to);
      return;
    }

    const normalizedPath = to.startsWith("#")
      ? to.slice(1)
      : to.startsWith("/")
        ? to
        : `/${to}`;
    const nextState =
      options && "state" in options ? (options.state ?? null) : null;
    const nextKey = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const nextHashUrl = `#${normalizedPath}`;

    try {
      const historyPayload = { usr: nextState, key: nextKey };
      if (options?.replace) {
        window.history.replaceState(historyPayload, "", nextHashUrl);
      } else {
        window.history.pushState(historyPayload, "", nextHashUrl);
      }
    } catch {
      window.location.hash = normalizedPath;
    }

    const qIdx = normalizedPath.indexOf("?");
    const pathname =
      qIdx === -1 ? normalizedPath : normalizedPath.slice(0, qIdx);
    const search = qIdx === -1 ? "" : normalizedPath.slice(qIdx);

    setLocation({
      pathname: pathname || "/",
      search,
      hash: "",
      state: nextState,
      key: nextKey,
    });
  }, []);

  const value = useMemo(
    () => ({ location, navigate }),
    [location, navigate],
  );

  return (
    <HashRouterContext.Provider value={value}>
      {children}
    </HashRouterContext.Provider>
  );
}

export function useLocation<
  S = HashLocationState | null,
>(): HashLocation<S> {
  const ctx = useContext(HashRouterContext);
  if (!ctx) {
    return {
      ...parseHashUrl(),
      state: (readHistoryUserState() as unknown as S) ?? (null as unknown as S),
      key: "fallback",
    };
  }
  return ctx.location as unknown as HashLocation<S>;
}

export function useNavigate(): NavigateFunction {
  const ctx = useContext(HashRouterContext);
  const fallbackNavigate = useCallback<NavigateFunction>((to, options) => {
    if (typeof window === "undefined") return;
    if (typeof to === "number") {
      window.history.go(to);
      return;
    }
    const normalizedPath = to.startsWith("#")
      ? to.slice(1)
      : to.startsWith("/")
        ? to
        : `/${to}`;
    const nextState =
      options && "state" in options ? (options.state ?? null) : null;
    try {
      if (options?.replace) {
        window.history.replaceState({ usr: nextState }, "", `#${normalizedPath}`);
      } else {
        window.history.pushState({ usr: nextState }, "", `#${normalizedPath}`);
      }
    } catch {
      window.location.hash = normalizedPath;
    }
  }, []);

  return ctx ? ctx.navigate : fallbackNavigate;
}
