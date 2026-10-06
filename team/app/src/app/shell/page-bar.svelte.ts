import type { Snippet } from "svelte";

/**
 * What the shell and the page on screen exchange. The page (PageHeader) lends the shell its toolbar, actions and
 * filters. The phone bar shows the actions and puts the filters behind a Filters button, in a sheet. On desktop,
 * once the page's own toolbar row has scrolled away (`pinned`), the shell shows the same row as a top bar. The
 * shell lends the page its section's strip (Games, Standings, Draft), which the toolbar row shows as pills.
 */
export const pageBar: {
  owner?: symbol;
  actions?: Snippet;
  filters?: Snippet;
  /** Search, a page's tabs. */
  toolbar?: Snippet;
  /** Desktop: the page's toolbar row has scrolled away, so the shell's bar takes over. */
  pinned: boolean;
  /** How many filters are on: the number on the Filters button. */
  active: number;
  onclear?: () => void;
  /** The section's pages, from the shell; the current one by id. */
  strip: { id: string; path: string; label: string }[];
  current: string;
} = $state({ active: 0, pinned: false, strip: [], current: "" });
