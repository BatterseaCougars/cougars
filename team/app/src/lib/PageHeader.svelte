<script lang="ts">
  /**
   * The top of a page: an eyebrow, the title (with a badge beside it) and one line under it. The page's controls
   * (search or tabs, filters, actions) go to the shell: on desktop they sit in the top bar, always, so they're in
   * reach however far the page has scrolled and whatever a filter does to its length. On phones the slim bar
   * shows the actions and puts the filters in a sheet, and the search or tabs stay here, under the line. Phones
   * also show the title in that bar, so here it's for screen readers only. Home has no header.
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
    Object.assign(pageBar, { owner: me, actions, filters, toolbar, active, onclear });
  });
  $effect(() => () => {
    if (pageBar.owner === me)
      Object.assign(pageBar, {
        owner: undefined,
        actions: undefined,
        filters: undefined,
        toolbar: undefined,
        active: 0,
        onclear: undefined,
      });
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
{#if toolbar && phone.current}
  <div class="toolbar">{@render toolbar()}</div>
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
