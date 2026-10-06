<script lang="ts">
  // On a phone, the page's one main thing to add, as a floating button (Material's extended FAB): bottom right,
  // above the tabs. Desktop puts the same action in the page's toolbar row instead, so the page shows this only
  // when phone.current. An icon and a short label; the page keeps its bar for the rest.
  import type { HTMLButtonAttributes } from "svelte/elements";
  import Icon from "../app/shell/Icon.svelte";
  import type { IconName } from "../app/shell/icons";

  let {
    label,
    icon = "plus",
    ...rest
  }: { label: string; icon?: IconName } & Omit<HTMLButtonAttributes, "children"> = $props();
</script>

<button class="fab" {...rest}>
  <Icon name={icon} size={22} />
  <span>{label}</span>
</button>

<style>
  .fab {
    position: fixed;
    right: var(--s-4);
    bottom: calc(var(--tab-h) + var(--s-4));
    z-index: 60;
    display: inline-flex;
    align-items: center;
    gap: var(--s-3);
    height: 3.5rem;
    padding: 0 var(--s-5) 0 var(--s-4);
    border: 0;
    border-radius: var(--r-lg);
    background: var(--primary);
    color: var(--primary-fg);
    font-weight: 600;
    letter-spacing: 0.01em;
    box-shadow:
      0 1px 3px rgb(0 0 0 / 0.4),
      0 8px 24px -6px rgb(0 0 0 / 0.7);
    transition:
      background-color var(--t-fast) var(--ease-in-out),
      box-shadow var(--t) var(--ease),
      transform var(--t-fast) var(--ease);
  }
  .fab:hover {
    background: var(--primary-hover);
    box-shadow:
      0 2px 6px rgb(0 0 0 / 0.45),
      0 12px 32px -6px rgb(0 0 0 / 0.75);
  }
  .fab:active {
    transform: scale(0.96);
  }
  /* Room under the last thing on the page, so the button never sits on it */
  :global(.page:has(> .fab)) {
    padding-bottom: 5.5rem;
  }
  .fab:focus-visible {
    outline-offset: 3px;
  }
</style>
