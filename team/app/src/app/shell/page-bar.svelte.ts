import type { Snippet } from "svelte";

/**
 * What the page on screen lends the phone's top bar: its actions (+ Event, Register) and its filters, which the bar
 * shows behind a Filters button in a bottom sheet. PageHeader fills it in; on desktop the header shows them itself.
 */
export const pageBar: {
  owner?: symbol;
  actions?: Snippet;
  filters?: Snippet;
  /** How many filters are on: the number on the Filters button. */
  active: number;
  onclear?: () => void;
} = $state({ active: 0 });
