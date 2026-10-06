<script lang="ts">
  /**
   * The top of a page: its title, one line under it, its actions on the right, and a toolbar row (search, tabs) with
   * the page's filters. Desktop pins it while the page scrolls under it, so the filters never go out of reach and
   * never move. Phones show the title in the shell's slim top bar instead, and move the actions and filters there
   * too (the filters into a sheet), leaving the line and the toolbar here. Home has no header.
   */
  import type { Snippet } from "svelte";
  import { pageBar } from "../app/shell/page-bar.svelte";
  import { phone } from "./viewport.svelte";

  let {
    title,
    subtitle,
    sub,
    actions,
    toolbar,
    filters,
    active = 0,
    onclear,
  }: {
    title: string;
    subtitle?: string;
    /** The line under the title, when it needs links. */
    sub?: Snippet;
    actions?: Snippet;
    /** Always shown: search, a page's tabs. */
    toolbar?: Snippet;
    /** Inline on desktop; in the Filters sheet on phones. */
    filters?: Snippet;
    /** How many filters are on. */
    active?: number;
    onclear?: () => void;
  } = $props();

  // Lend the phone bar this page's actions and filters. A page arriving can register before the one leaving has
  // cleaned up, so each only clears what it set.
  const me = Symbol("page");
  $effect(() => {
    Object.assign(pageBar, { owner: me, actions, filters, active, onclear });
  });
  $effect(() => () => {
    if (pageBar.owner === me)
      Object.assign(pageBar, {
        owner: undefined,
        actions: undefined,
        filters: undefined,
        active: 0,
        onclear: undefined,
      });
  });
</script>

<header class="page-header">
  <div class="top">
    <div class="titles">
      <h1 class="poster">{title}</h1>
      {#if sub}<p class="line hint">{@render sub()}</p>{:else if subtitle}<p class="line hint">{subtitle}</p>{/if}
    </div>
    {#if actions && !phone.current}<div class="actions">{@render actions()}</div>{/if}
  </div>
  {#if toolbar || (filters && !phone.current)}
    <div class="toolbar">
      {#if toolbar}{@render toolbar()}{/if}
      {#if filters && !phone.current}{@render filters()}{/if}
    </div>
  {/if}
</header>

<style>
  .page-header {
    display: grid;
    gap: var(--s-4);
    min-width: 0;
  }
  .top {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--s-4);
  }
  .titles {
    display: grid;
    gap: var(--s-2);
    min-width: 0;
  }
  .line :global(a) {
    color: var(--fg);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    flex-shrink: 0;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    min-width: 0;
  }
  .toolbar > :global(*) {
    min-width: 0;
  }

  /* Desktop: pinned. Clear over the page's poster word at the top; frosted once the page scrolls under it, edge to
     edge, with no line: the frost is the edge. */
  @media (min-width: 901px) {
    .page-header {
      position: sticky;
      top: 0;
      z-index: 4;
      margin: calc(-1 * var(--s-5)) calc(50% - 50vw) 0;
      padding: var(--s-6) calc(50vw - 50%) var(--s-4);
      transition: background-color var(--t-slow) var(--ease);
    }
    /* The section's pills float along the top of a tournament; leave them room */
    :global(.view.in-fold) .page-header {
      padding-top: 4.5rem;
    }
    :global(.view.scrolled) .page-header {
      background: var(--chrome-bg-solid);
      backdrop-filter: var(--blur);
      -webkit-backdrop-filter: var(--blur);
    }
  }

  /* Phones: the slim bar names the page; the line stays, on one line */
  @media (max-width: 900px) {
    .page-header {
      gap: var(--s-3);
    }
    h1 {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    .line {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .page-header:not(:has(.line, .toolbar)) {
      display: none;
    }
  }
</style>
