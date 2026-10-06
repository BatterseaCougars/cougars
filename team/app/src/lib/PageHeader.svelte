<script lang="ts">
  /**
   * The top of a page: an eyebrow, the title (with a badge beside it), one line under it, then the toolbar row:
   * the section's pages (Games, Standings, Draft), the page's search or tabs, its filters, and its actions on the
   * right. On desktop the title scrolls away like content and the row docks just under the top of the window; as
   * it rises, the shell's veil is already fading in behind it (Shell.svelte), so the title dissolves and the row
   * takes its place in one motion. A page with a row is kept a little taller than the window, so a filter that
   * shortens the list can't snap the scroll back and move the row under your pointer. Phones show the title in
   * the shell's slim bar (so here it's for screen readers only), and the shell takes the actions and filters too;
   * the line and the search or tabs stay here. Home has no header.
   */
  import type { Snippet } from "svelte";
  import Icon from "../app/shell/Icon.svelte";
  import type { IconName } from "../app/shell/icons";
  import Pills from "./Pills.svelte";
  import { pageBar } from "../app/shell/page-bar.svelte";
  import { phone } from "./viewport.svelte";

  let {
    title,
    subtitle,
    sub,
    eyebrow,
    eyebrowIcon,
    badge,
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
    /** Above the title: the section this page belongs to. Coloured with --tone, when the page sets one. */
    eyebrow?: string;
    eyebrowIcon?: IconName;
    /** Beside the title: a status. */
    badge?: Snippet;
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

  const strip = $derived(!phone.current && pageBar.strip.length > 1 ? pageBar.strip : []);
  const hasToolbar = $derived(Boolean(toolbar || strip.length || (!phone.current && (filters || actions))));

  // Desktop: when the page gets shorter under the docked row (a filter left a few results), and what's left fits
  // on one screen, start it right under the row. The row stays where it is; the results come to it, rather than
  // sitting hidden above it under the veil.
  let header = $state<HTMLElement | undefined>();
  let row = $state<HTMLElement | undefined>();
  $effect(() => {
    const el = row;
    const hd = header;
    if (!el || !hd || phone.current) return;
    const view = el.closest<HTMLElement>(".view");
    const page = el.parentElement;
    if (!view || !page) return;
    const ro = new ResizeObserver(() => {
      const dock = page.offsetTop + hd.offsetTop + hd.offsetHeight;
      const last = page.lastElementChild;
      if (view.scrollTop <= dock || !last) return;
      const content = last.getBoundingClientRect().bottom - page.getBoundingClientRect().top;
      if (content - dock <= view.clientHeight) view.scrollTop = dock;
    });
    ro.observe(page);
    return () => ro.disconnect();
  });
</script>

<header class="page-header" bind:this={header}>
  <div class="titles">
    {#if eyebrow}
      <p class="eyebrow-line">
        {#if eyebrowIcon}<Icon name={eyebrowIcon} size={14} />{/if}{eyebrow}
        {#if badge && phone.current}{@render badge()}{/if}
      </p>
    {/if}
    <div class="title-row">
      <h1 class="poster">{title}</h1>
      {#if badge && !phone.current}{@render badge()}{/if}
    </div>
    {#if sub}<p class="line hint">{@render sub()}</p>{:else if subtitle}<p class="line hint">{subtitle}</p>{/if}
  </div>
</header>
<!-- A sibling of the header, not a child: a sticky element can only pin within its parent, and the header scrolls away -->
{#if hasToolbar}
  <div class="toolbar page-toolbar" bind:this={row}>
    {#if strip.length}<Pills items={strip} current={pageBar.current} />{/if}
    {#if toolbar}{@render toolbar()}{/if}
    {#if filters && !phone.current}{@render filters()}{/if}
    {#if actions && !phone.current}<div class="actions">{@render actions()}</div>{/if}
  </div>
{/if}

<style>
  .page-header {
    display: grid;
    gap: var(--s-4);
    min-width: 0;
  }
  .titles {
    display: grid;
    gap: var(--s-2);
    min-width: 0;
  }
  .eyebrow-line {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    min-height: 1.5rem;
    color: var(--tone, var(--fg-muted));
    font-size: var(--text-2xs);
    font-weight: 700;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
  }
  .eyebrow-line :global(.badge) {
    letter-spacing: normal;
    text-transform: none;
  }
  .title-row {
    display: flex;
    align-items: center;
    gap: var(--s-3);
  }
  .line :global(a) {
    color: var(--fg);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .toolbar {
    margin-top: calc(var(--s-4) - var(--s-5));
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--s-3);
    min-width: 0;
  }

  .toolbar > :global(*) {
    min-width: 0;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    margin-left: auto;
  }

  /* Desktop: the row docks just under the top as the page scrolls; the shell's veil is behind it by then */
  @media (min-width: 901px) {
    .toolbar {
      position: sticky;
      top: var(--s-4);
      z-index: 4;
    }
    /* The veil, once the page has scrolled: its background in from the top of the window with a blur that fades
       out, under the row and over the cards, so the title dissolves and the cards do too. No edge. */
    .toolbar::before {
      content: "";
      position: fixed;
      z-index: -1;
      top: 0;
      left: 0;
      right: 0;
      height: 5.5rem;
      background: linear-gradient(
        to bottom,
        var(--bg),
        color-mix(in srgb, var(--bg) 85%, transparent) 55%,
        transparent
      );
      backdrop-filter: blur(18px) saturate(1.2);
      -webkit-backdrop-filter: blur(18px) saturate(1.2);
      mask-image: linear-gradient(to bottom, #000 55%, transparent);
      -webkit-mask-image: linear-gradient(to bottom, #000 55%, transparent);
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--t-slow) var(--ease);
    }
    :global(.view.scrolled) .toolbar::before {
      opacity: 1;
    }
    .toolbar :global(.search) {
      width: 14rem;
    }
    /* Always a little taller than the window, so a shorter list can't snap the scroll back past the dock */
    :global(.page:has(> .page-toolbar)) {
      align-content: start;
      min-height: calc(100% + 12rem);
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
    .title-row:not(:has(> :not(h1))) {
      display: none;
    }
    .line {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .page-header:not(:has(.line, .toolbar, .eyebrow-line)) {
      display: none;
    }
  }
</style>
