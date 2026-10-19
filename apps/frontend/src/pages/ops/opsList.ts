/* ────────────────────────────────────────────────────────────────────────
   opsList.ts — shared list state for the console's table pages.

   The backend paginates and filters server-side (`page`, `limit`, `q`,
   `status`, `provider`, …). Before this existed the pages fetched a fixed
   100 rows and narrowed them in the browser, so search silently missed
   anything outside that window. These helpers push the query to the server,
   debounce typing, and expose real totals for <Pager>.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface ListResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  /** Optional passthrough for a page that needs extra server-side data
   *  alongside its rows (e.g. the KYC queue's actionable-status split).
   *  Typed as unknown so each page narrows it itself. */
  extra?: unknown;
}

export interface ListFetchParams {
  page: number;
  limit: number;
  q: string;
}

export const DEFAULT_LIMIT = 25;

/** Delays propagating a rapidly-changing value (e.g. a search box). */
export function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

export interface ListPageState<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  loading: boolean;
  error: string | null;
  /** Raw (undebounced) search text, for the input's value. */
  search: string;
  setSearch: (v: string) => void;
  setPage: (p: number) => void;
  /** Bump to re-run the current query. */
  reload: () => void;
  /** The fetcher's `extra` passthrough, if it supplied one. */
  extra: unknown;
}

/**
 * Drives one server-paginated list. `fetcher` is held in a ref so an inline
 * closure does not retrigger loads on every render. Pass server-side filter
 * state through `deps` — changing any entry refetches from page 1.
 */
export function useListPage<T>(
  fetcher: (p: ListFetchParams) => Promise<ListResult<T>>,
  limit = DEFAULT_LIMIT,
  deps: readonly unknown[] = [],
): ListPageState<T> {
  const [search, setSearchRaw] = useState("");
  const [page, setPage] = useState(1);
  const [nonce, setNonce] = useState(0);

  const q = useDebounced(search);
  const depKey = JSON.stringify(deps);

  /* `fetcher` is an inline closure in every caller, so it is held in a ref.
     The sync effect is declared before the load effect, so the ref is always
     current by the time a request is issued. */
  const fnRef = useRef(fetcher);
  useEffect(() => {
    fnRef.current = fetcher;
  });

  /* Reset to page 1 when the search term or any filter changes. Done during
     render (React's "adjust state on prop change" pattern) rather than in an
     effect, which would render twice per change. */
  const [lastSearch, setLastSearch] = useState(q);
  const [lastDepKey, setLastDepKey] = useState(depKey);
  if (lastSearch !== q || lastDepKey !== depKey) {
    setLastSearch(q);
    setLastDepKey(depKey);
    setPage(1);
  }

  const setSearch = useCallback((v: string) => {
    setSearchRaw(v);
    setPage(1);
  }, []);

  /* Results are tagged with the query that produced them (`queryKey`) and with
     the exact request (`reqKey`). Background reloads only change `nonce`, so
     the previous rows stay visible while the refresh is in flight — otherwise
     a polling page (Support Desk) dropped its whole table into a loading box
     every couple of seconds and the console visibly jumped. Rows are cleared
     only when the query itself changes, which stops stale data from the
     previous page or filter flashing on screen. */
  const queryKey = `${page}|${limit}|${q}|${depKey}`;
  const reqKey = `${queryKey}|${nonce}`;

  const [settled, setSettled] = useState<{
    key: string;
    queryKey: string;
    result: ListResult<T> | null;
    error: string | null;
  }>({ key: "", queryKey: "", result: null, error: null });

  useEffect(() => {
    let alive = true;
    // The backend rejects `q` shorter than 2 characters on most list routes.
    const term = q.trim().length >= 2 ? q.trim() : "";
    fnRef
      .current({ page, limit, q: term })
      .then((r) => {
        if (alive) {
          setSettled({ key: reqKey, queryKey, result: r, error: null });
        }
      })
      .catch((e: unknown) => {
        if (alive) {
          setSettled((prev) => ({
            key: reqKey,
            queryKey,
            // A failed background refresh should not wipe rows that are still
            // valid for this query; a failed new query has nothing to keep.
            result: prev.queryKey === queryKey ? prev.result : null,

            error: e instanceof Error ? e.message : String(e),
          }));
        }
      });
    return () => {
      alive = false;
    };
    // `reqKey` encodes page, limit, q, the filter signature and the reload
    // nonce, so listing it alone is both correct and stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqKey]);

  const loading = settled.queryKey !== queryKey;
  const error = settled.queryKey === queryKey ? settled.error : null;

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const live = settled.queryKey === queryKey ? settled.result : null;


  return useMemo(
    () => ({
      rows: live?.rows ?? [],
      total: live?.total ?? 0,
      page: live?.page ?? page,
      pageSize: live?.pageSize ?? limit,
      pages: Math.max(1, Math.ceil((live?.total ?? 0) / (live?.pageSize ?? limit))),
      loading,
      error,
      search,
      setSearch,
      setPage,
      reload,
      extra: live?.extra ?? null,
    }),
    [live, page, limit, loading, error, search, setSearch, reload],
  );
}