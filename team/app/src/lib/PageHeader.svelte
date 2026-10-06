<script lang="ts">
  /**
   * The top of a page: an eyebrow, the title (with a badge beside it), one line under it, then the toolbar row:
   * the section's pages (Games, Standings, Draft), the page's search or tabs, its filters, and its actions on
   * the right. The title scrolls away like content. On desktop the toolbar row pins at the top of the column as
   * the page scrolls under it: no bar behind it, just a veil of the page's own background that the cards dissolve
   * into. Phones show the title in the shell's slim bar (so here it's for screen readers only), and the shell
   * takes the actions and filters too; the line and the search or tabs stay here. Home has no header.
   */
  import type { Snippet } from "svelte";
  import Icon from "../app/shell/Icon.svelte";
  import type { IconName } from "../app/shell/icons";
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

  // The veil shows once the toolbar is pinned: a marker just above it tells us when it has gone under
  let marker = $state<HTMLElement | undefined>();
  let pinned = $state(false);
  $effect(() => {
    const el = marker;
    if (!el || phone.current) {
      pinned = false;
      return;
    }
    const root = el.closest(".view");
    const io = new IntersectionObserver(([e]) => (pinned = !e.isIntersecting && e.boundingClientRect.top < 200), {
      root,
      rootMargin: "-17px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  });
</script>

<header class="page-header">
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
<!-- Siblings of the header, not children: a sticky element can only pin within its parent, and the header scrolls away -->
{#if hasToolbar}
  <div class="marker" bind:this={marker} aria-hidden="true"></div>
  <div class="toolbar" class:pinned>
    {#if strip.length}
      <nav class="pills" aria-label="Pages">
        {#each strip as r (r.id)}
          <a
            class="pill"
            class:on={r.id === pageBar.current}
            href={r.path}
            aria-current={r.id === pageBar.current ? "page" : undefined}>{r.label}</a
          >
        {/each}
      </nav>
    {/if}
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
  .marker {
    height: 0;
    margin-top: calc(-1 * var(--s-5));
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
  /* The section's pages: one tinted group, no outline */
  .pills {
    display: inline-flex;
    gap: 2px;
    padding: 3px;
    border-radius: var(--r-md);
    background: color-mix(in srgb, var(--surface-2) 75%, transparent);
  }
  .pill {
    display: inline-flex;
    align-items: center;
    height: 1.95rem;
    padding: 0 var(--s-3);
    border-radius: var(--r-sm);
    color: var(--fg-muted);
    font-size: var(--text-sm);
    font-weight: 500;
    transition:
      color var(--t) var(--ease-in-out),
      background-color var(--t) var(--ease-in-out);
  }
  .pill:hover,
  .pill.on {
    color: var(--fg);
  }
  .pill.on {
    background: color-mix(in srgb, var(--fg) 12%, transparent);
  }

  /* Desktop: the toolbar row pins while the page scrolls. Behind it, once pinned, a veil: the page's background
     coming in from the top with a blur that fades out, so cards dissolve under the controls. No edge anywhere. */
  @media (min-width: 901px) {
    .toolbar {
      position: sticky;
      top: var(--s-4);
      z-index: 4;
    }
    .toolbar::before {
      content: "";
      position: absolute;
      z-index: -1;
      top: calc(-1 * var(--s-4));
      bottom: calc(-1 * var(--s-8));
      left: 50%;
      width: 100vw;
      translate: -50% 0;
      background: linear-gradient(
        to bottom,
        color-mix(in srgb, var(--bg) 96%, transparent),
        color-mix(in srgb, var(--bg) 78%, transparent) 45%,
        transparent
      );
      backdrop-filter: blur(18px) saturate(1.2);
      -webkit-backdrop-filter: blur(18px) saturate(1.2);
      mask-image: linear-gradient(to bottom, #000 40%, transparent);
      -webkit-mask-image: linear-gradient(to bottom, #000 40%, transparent);
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--t-slow) var(--ease);
    }
    .toolbar.pinned::before {
      opacity: 1;
    }
    .toolbar :global(.search) {
      width: 14rem;
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
