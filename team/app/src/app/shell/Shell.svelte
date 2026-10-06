<script lang="ts">
  import { onMount, tick, type Snippet } from "svelte";
  import { fade } from "svelte/transition";
  import { can } from "../../access/actions";
  import { granted } from "../../demo/session.svelte";
  import { stripRoutes, tabHref, tabRoutes } from "../mobile-nav";
  import { ROUTES, TABS, type Route, type TabId } from "../nav-routes";
  import { navigate, router } from "../router.svelte";
  import { easeOut, fadeMs, flyMs, prefersReducedMotion, zoom } from "../motion";
  import { createMark, pillShape, rowShape, underlineShape } from "./mark";
  import Icon from "./Icon.svelte";
  import mark from "../../assets/cougars-mark.webp";

  let { route, children }: { route: Route; children: Snippet } = $props();

  const perms = $derived(granted());
  const strip = $derived(route.focus ? [] : stripRoutes(route.tab, perms));
  const tabLabel = $derived(TABS.find((t) => t.id === route.tab)?.label ?? "");

  let content: HTMLElement | undefined = $state();
  let railNav: HTMLElement | undefined = $state();
  let railMark: HTMLElement | undefined = $state();
  let tabsNav: HTMLElement | undefined = $state();
  let tabsMark: HTMLElement | undefined = $state();
  let stripNav: HTMLElement | undefined = $state();
  let stripMark: HTMLElement | undefined = $state();

  // Tapping the tab you're on goes to its first page; on the first page, it scrolls to the top.
  function onTab(tab: TabId, event: MouseEvent) {
    if (tab !== route.tab) return;
    event.preventDefault();
    const first = tabRoutes(tab, perms)[0]?.path ?? "/";
    if (router.path !== first) navigate(first);
    else content?.querySelector(".view")?.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }

  const railGroups = $derived(
    TABS.map((t) => ({
      ...t,
      routes: ROUTES.filter((r) => r.tab === t.id && !r.focus && r.id !== "more" && can(perms, r.action)),
    })).filter((g) => g.routes.length),
  );

  // Pages fly up as they arrive and fade as they leave; full-screen pages zoom in from a blur.
  function enter(node: Element, { focus }: { focus?: boolean }) {
    if (focus) return zoom(node);
    return {
      duration: flyMs,
      easing: easeOut,
      css: (t: number, u: number) => `opacity: ${t}; transform: translateY(${10 * u}px)`,
    };
  }
  function leave(node: Element, { focus }: { focus?: boolean }) {
    return focus ? zoom(node, { out: true }) : fade(node, { duration: fadeMs });
  }

  onMount(() => {
    const marks = [
      railNav && railMark && createMark(railNav, railMark, rowShape),
      tabsNav && tabsMark && createMark(tabsNav, tabsMark, pillShape),
      stripNav && stripMark && createMark(stripNav, stripMark, underlineShape),
    ];
    for (const m of marks) m?.move(false);

    // Keep the current page's strip link in view, centred where there's room.
    const centre = () => {
      const el = stripNav?.querySelector<HTMLElement>("[data-mark]");
      if (!el || !stripNav) return;
      const left = el.offsetLeft - (stripNav.clientWidth - el.offsetWidth) / 2;
      stripNav.scrollTo({ left: Math.max(0, left), behavior: prefersReducedMotion ? "auto" : "smooth" });
    };

    $effect(() => {
      void route.id;
      void perms;
      tick().then(() => {
        for (const m of marks) m?.move(true);
        centre();
      });
    });

    return () => marks.forEach((m) => m?.destroy());
  });
</script>

<div class="shell" class:focus={route.focus}>
  <aside class="rail" aria-label="Main" inert={route.focus || undefined}>
    <a class="brand" href="/">
      <img src={mark} alt="" width="34" height="34" />
      <span class="brand-text">
        <span class="display brand-title">Cougars</span>
        <span class="brand-sub">Team app</span>
      </span>
    </a>
    <nav class="nav" bind:this={railNav}>
      <span class="nav-mark" bind:this={railMark} aria-hidden="true"></span>
      {#each railGroups as group (group.id)}
        <p class="nav-group eyebrow">{group.label}</p>
        {#each group.routes as r (r.id)}
          {@const on = r.id === route.id}
          <a
            class="nav-item"
            class:on
            href={r.path}
            data-mark={on ? "" : undefined}
            aria-current={on ? "page" : undefined}
          >
            <Icon name={r.icon} size={18} />
            <span>{r.name}</span>
          </a>
        {/each}
      {/each}
    </nav>
  </aside>

  <main class="main">
    {#if strip.length}
      <nav class="strip" aria-label="{tabLabel} pages" bind:this={stripNav}>
        <span class="strip-mark" bind:this={stripMark} aria-hidden="true"></span>
        {#each strip as r (r.id)}
          {@const on = r.id === route.id}
          <a
            class="strip-link"
            class:on
            href={r.path}
            data-mark={on ? "" : undefined}
            aria-current={on ? "page" : undefined}
          >
            {r.short ?? r.name}
          </a>
        {/each}
      </nav>
    {/if}

    <div class="content" bind:this={content}>
      {#key route.id}
        <div
          class="view"
          class:under-strip={strip.length > 0}
          class:under-tabs={!route.focus}
          in:enter={{ focus: route.focus }}
          out:leave={{ focus: route.focus }}
        >
          {@render children()}
        </div>
      {/key}
    </div>

    <nav class="tabs" aria-label="Primary" bind:this={tabsNav} inert={route.focus || undefined}>
      <span class="tab-mark" bind:this={tabsMark} aria-hidden="true"></span>
      {#each TABS as tab (tab.id)}
        {@const on = route.tab === tab.id}
        <a
          class="tab"
          class:on
          href={tabHref(tab.id, perms, router.last)}
          data-mark={on ? "" : undefined}
          aria-current={on ? "true" : undefined}
          onclick={(e) => onTab(tab.id, e)}
        >
          <span class="tab-icon" data-mark-anchor><Icon name={tab.icon} size={22} /></span>
          <span class="tab-label">{tab.label}</span>
        </a>
      {/each}
    </nav>
  </main>
</div>

<style>
  .shell {
    display: grid;
    grid-template-columns: var(--rail-w) minmax(0, 1fr);
    height: 100dvh;
    overflow: hidden;
    transition: grid-template-columns var(--t-slow) var(--ease);
  }
  .shell.focus {
    grid-template-columns: 0 minmax(0, 1fr);
  }

  /* ─── Rail (desktop) ─── */
  .rail {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 0 var(--s-3) var(--s-4);
    border-right: 1px solid var(--border);
    background: var(--panel-bg);
    backdrop-filter: var(--blur);
    -webkit-backdrop-filter: var(--blur);
    overflow: hidden;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    height: 4rem;
    margin: 0 calc(-1 * var(--s-3)) var(--s-3);
    padding: 0 var(--s-4);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  .brand img {
    filter: drop-shadow(0 2px 8px rgb(229 19 31 / 0.35));
  }
  .brand-text {
    display: grid;
    line-height: 1.1;
  }
  .brand-title {
    font-size: 1.3rem;
    color: var(--fg);
  }
  .brand-sub {
    font-size: var(--text-xs);
    color: var(--fg-muted);
  }
  .nav {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
  .nav-group {
    margin: var(--s-4) var(--s-3) var(--s-1);
    color: var(--fg-subtle);
  }
  .nav-group:first-child {
    margin-top: var(--s-1);
  }
  .nav-item {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: var(--s-3);
    height: 2.625rem;
    padding: 0 var(--s-3);
    border-radius: var(--r-md);
    color: var(--fg-muted);
    font-size: var(--text-sm);
    font-weight: 500;
    white-space: nowrap;
    transition:
      color var(--t-fast) var(--ease-in-out),
      background-color var(--t-fast) var(--ease-in-out);
  }
  .nav-item:hover:not(.on) {
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    color: var(--fg);
  }
  .nav-item.on {
    color: var(--fg);
  }
  .nav-item.on :global(svg) {
    color: var(--red-hot);
  }
  .nav-item:focus-visible {
    outline-offset: -2px;
  }
  /* The current page's mark: one shape for the whole rail, moved by mark.ts */
  .nav-mark {
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    opacity: 0;
    background: var(--red-wash);
    box-shadow: inset 0 0 0 1px var(--red-border);
    pointer-events: none;
  }

  /* ─── Main ─── */
  .main {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  .content {
    position: relative;
    flex: 1;
    min-height: 0;
  }
  /* Views stack, so one can fade out while the next flies in. Each scrolls on its own. */
  .view {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }
  .view.under-strip {
    padding-top: var(--strip-h);
  }

  /* ─── Strip of sub-pages: frosted, content scrolls under it ─── */
  .strip {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 5;
    display: flex;
    align-items: stretch;
    gap: var(--s-1);
    height: var(--strip-h);
    padding: 0 calc(var(--gutter) - var(--s-2));
    overflow-x: auto;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
    border-bottom: 1px solid var(--border);
    background: var(--chrome-bg);
    backdrop-filter: var(--blur);
    -webkit-backdrop-filter: var(--blur);
  }
  .strip::-webkit-scrollbar {
    display: none;
  }
  .strip-link {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    padding: 0 var(--s-2);
    scroll-snap-align: start;
    color: var(--fg-muted);
    font-size: var(--text-sm);
    font-weight: 500;
    white-space: nowrap;
    transition: color var(--t) var(--ease-in-out);
  }
  .strip-link:hover,
  .strip-link.on {
    color: var(--fg);
  }
  .strip-link.on {
    font-weight: 600;
  }
  .strip-link:focus-visible {
    outline-offset: -2px;
  }
  .strip-mark {
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0;
    background: var(--red-hot);
    pointer-events: none;
  }

  /* Desktop: the rail already lists each tab's pages, so the strip only shows on phones */
  @media (min-width: 901px) {
    .strip {
      display: none;
    }
    .view.under-strip {
      padding-top: 0;
    }
  }

  /* ─── Bottom tabs (phones): frosted, content scrolls under them ─── */
  .tabs {
    display: none;
  }

  @media (max-width: 900px) {
    .shell,
    .shell.focus {
      grid-template-columns: minmax(0, 1fr);
    }
    .rail {
      display: none;
    }
    .main {
      padding-top: env(safe-area-inset-top, 0px);
    }
    .view.under-tabs {
      padding-bottom: var(--tab-h);
    }
    .tabs {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 5;
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(0, 1fr);
      height: var(--tab-h);
      padding: var(--s-2) var(--s-2) env(safe-area-inset-bottom, 0px);
      border-top: 1px solid var(--border);
      background: var(--chrome-bg);
      backdrop-filter: var(--blur);
      -webkit-backdrop-filter: var(--blur);
      transform: translateY(0);
      transition:
        transform var(--t-slow) var(--ease),
        opacity var(--t-slow) var(--ease);
    }
    .focus .tabs {
      transform: translateY(100%);
      opacity: 0;
      pointer-events: none;
    }
    .tab {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.3rem;
      min-height: 2.75rem;
      color: var(--fg-muted);
      font-size: var(--text-2xs);
      font-weight: 600;
      letter-spacing: 0.01em;
      transition: color var(--t) var(--ease-in-out);
    }
    .tab-icon {
      display: inline-flex;
      transition: transform var(--t-slow) var(--ease);
    }
    .tab.on {
      color: var(--fg);
    }
    .tab.on .tab-icon {
      color: var(--red-hot);
      transform: translateY(-1px);
    }
    .tab:active .tab-icon {
      transform: scale(0.9);
    }
    .tab:focus-visible {
      outline-offset: -2px;
    }
    .tab-label {
      line-height: 1;
    }
    .tab-mark {
      position: absolute;
      top: 0;
      left: 0;
      opacity: 0;
      background: var(--red-wash);
      box-shadow: inset 0 0 0 1px var(--red-border);
      pointer-events: none;
    }
  }
</style>
