<script lang="ts">
  /**
   * The top of a page: its title, one line under it, its actions on the right, and a toolbar row (search, a page's
   * tabs). It scrolls away with the page, like any content. The page's filters live where they stay in reach:
   * on a wide desktop the shell floats them down the right edge, mirroring the dock; on a narrower desktop they're
   * a row under the title; on phones they're behind the shell's Filters button, in a sheet. Phones show the title
   * in the shell's slim bar, so here it's for screen readers only. Home has no header.
   */
  import type { Snippet } from "svelte";
  import { pageBar } from "../app/shell/page-bar.svelte";
  import { phone, wide } from "./viewport.svelte";

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
    {#if actions && !phone.current && !wide.current}<div class="actions">{@render actions()}</div>{/if}
  </div>
  {#if toolbar || (filters && !phone.current && !wide.current)}
    <div class="toolbar">
      {#if toolbar}{@render toolbar()}{/if}
      {#if filters && !phone.current && !wide.current}{@render filters()}{/if}
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

  @media (min-width: 901px) {
    /* The section's pills float along the top of a tournament; leave them room */
    :global(.view.in-fold) .page-header {
      padding-top: 4.5rem;
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
