import type { Snippet } from "svelte";

/**
 * What the shell and the page on screen exchange. The page (PageHeader) lends the shell its toolbar, actions and
 * filters. On desktop the shell's top bar shows them all, always, between the mark and your badge: one place,
 * whatever the page is doing. The phone bar shows the actions and puts the filters behind a Filters button, in a
 * sheet; the toolbar (search, tabs) stays in the page there.
 */
export const pageBar: {
  owner?: symbol;
  actions?: Snippet;
  filters?: Snippet;
  /** Search, a page's tabs. */
  toolbar?: Snippet;
  /** How many filters are on: the number on the Filters button. */
  active: number;
  onclear?: () => void;
} = $state({ active: 0 });
