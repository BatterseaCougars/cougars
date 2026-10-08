<script module lang="ts">
  // Where the bar under the current tab was, so on the next page it slides across from there (each page draws its
  // own tabs, so this outlives them)
  let last: { left: number; width: number } | null = null;
</script>

<script lang="ts">
  // A section's pages (The Kumite, Fight card, The board, Teams, Draft) as tabs in the club's italic capitals, the
  // one you're on marked with the poster title's red slash. Desktop only.
  import { prefersReducedMotion } from "../app/motion";

  let { items, current }: { items: { id: string; path: string; label: string }[]; current: string } = $props();

  let nav = $state<HTMLElement | undefined>();
  let bar = $state<{ left: number; width: number } | null>(null);
  let moving = $state(false);

  $effect(() => {
    void current;
    const on = nav?.querySelector<HTMLElement>(".tab.on");
    if (!on) return;
    const here = { left: on.offsetLeft, width: on.offsetWidth };
    // The display face can arrive after the first layout, widening the tabs: measure again once it has
    if (document.fonts?.status === "loading")
      void document.fonts.ready.then(() => {
        if (!on.isConnected) return;
        moving = false;
        bar = last = { left: on.offsetLeft, width: on.offsetWidth };
      });
    if (!last || prefersReducedMotion || (last.left === here.left && last.width === here.width)) {
      bar = here;
      last = here;
      return;
    }
    // Start where it was, then slide to here
    moving = false;
    bar = last;
    last = here;
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        moving = true;
        bar = here;
      }),
    );
    return () => cancelAnimationFrame(frame);
  });
</script>

<nav class="tabs" aria-label="Pages" bind:this={nav}>
  {#each items as r (r.id)}
    <a class="tab" class:on={r.id === current} href={r.path} aria-current={r.id === current ? "page" : undefined}>
      {r.label}
    </a>
  {/each}
  {#if bar}
    <span class="bar" class:moving style:translate="{bar.left}px 0" style:width="{bar.width}px" aria-hidden="true"
    ></span>
  {/if}
</nav>

<style>
  .tabs {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
    gap: var(--s-1);
    height: 2.25rem;
  }
  .tab {
    display: inline-flex;
    align-items: center;
    padding: 0 var(--s-3);
    color: var(--fg-subtle);
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-style: italic;
    letter-spacing: 0.03em;
    line-height: 1;
    text-transform: uppercase;
    white-space: nowrap;
    transition: color var(--t-fast) var(--ease-in-out);
  }
  .tab:hover {
    color: var(--fg-muted);
  }
  .tab.on {
    color: var(--fg);
  }
  .tab:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: -2px;
    border-radius: var(--r-sm);
  }
  /* The poster title's red slash, under the tab you're on */
  .bar {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 4px;
    pointer-events: none;
  }
  .bar::before {
    content: "";
    position: absolute;
    inset: 0 var(--s-3);
    transform: skewX(-24deg);
    background: var(--red);
  }
  .bar.moving {
    transition:
      translate 420ms cubic-bezier(0.16, 1, 0.3, 1),
      width 420ms cubic-bezier(0.16, 1, 0.3, 1);
  }
</style>
