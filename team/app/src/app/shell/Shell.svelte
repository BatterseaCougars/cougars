<script lang="ts">
  import { type Snippet } from "svelte";
  import { fade } from "svelte/transition";
  import { can } from "../../access/actions";
  import { granted, impersonating, me, realMember, rolesOf, viewAs } from "../../demo/session.svelte";
  import { stripRoutes, tabHref, tabRoutes } from "../mobile-nav";
  import { type Route, type TabId } from "../nav-routes";
  import { folds, routes, tabs } from "../routes.svelte";
  import { navigate, router } from "../router.svelte";
  import { easeOut, fadeMs, flyMs, prefersReducedMotion, zoom } from "../motion";
  import { glide, pillShape, rowShape, underlineShape } from "./mark";
  import AccountMenu from "./AccountMenu.svelte";
  import Icon from "./Icon.svelte";
  import logo from "../../assets/cougars-mark.webp";

  let { route, children }: { route: Route; children: Snippet } = $props();

  const perms = $derived(granted());
  const all = $derived(routes());
  const tabList = $derived(tabs());
  const strip = $derived(route.focus ? [] : stripRoutes(all, route, perms));
  const allowed = (r: Route) => !r.focus && !r.hidden && can(perms, r.action);

  // Rail, flat: Home, a link per training, Calendar, the club pages. Then a folding section per tournament type,
  // then Settings. Both come from what admins set up, so a new training or tournament appears here.
  const flat = $derived(
    all.filter(
      (r) => allowed(r) && (r.tab === "home" || r.tab === "training" || r.tab === "calendar" || r.group === "Club"),
    ),
  );
  const railFolds = $derived(
    [
      ...folds()
        .map((f) => ({ ...f, groups: [{ label: "", routes: all.filter((r) => r.fold === f.id && allowed(r)) }] }))
        .filter((f) => f.groups[0].routes.length),
      {
        id: "settings",
        name: "Settings",
        icon: "settings" as const,
        groups: (["People", "Schedule", "Money"] as const)
          .map((label) => ({ label, routes: all.filter((r) => r.section === label && allowed(r)) }))
          .filter((g) => g.routes.length),
      },
    ].filter((f) => f.groups.length),
  );
  const foldOf = (r: Route) => (r.group === "Settings" ? "settings" : r.fold);

  // Which folds are open, remembered. The current page's fold is always open.
  const OPEN_KEY = "team.rail.open";
  let opened = $state<Record<string, boolean>>(readOpen());
  function readOpen(): Record<string, boolean> {
    try {
      return JSON.parse(localStorage.getItem(OPEN_KEY) ?? "{}");
    } catch {
      return {};
    }
  }
  const isOpen = (id: string) => Boolean(opened[id]) || foldOf(route) === id;
  function toggle(id: string) {
    opened = { ...opened, [id]: !isOpen(id) };
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(opened));
    } catch {
      // Private mode: the rail forgets.
    }
  }

  // Desktop top bar: where you are.
  const crumbs = $derived.by(() => {
    if (route.group === "Settings") return ["Settings", route.name];
    if (route.group === "You") return ["You", route.name];
    if (route.group) return [route.name];
    const fold = folds().find((f) => f.id === route.fold);
    if (fold) return [fold.name, route.name];
    return [route.name];
  });

  let chromeH = $state(0);
  let content: HTMLElement | undefined = $state();

  // Tapping the tab you're on goes to its first page; on the first page, it scrolls to the top.
  function onTab(tab: TabId, event: MouseEvent) {
    if (tab !== route.tab) return;
    event.preventDefault();
    const first = tabRoutes(all, tab, perms)[0]?.path ?? "/";
    if (router.path !== first) navigate(first);
    else content?.querySelector(".view")?.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }

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

  // Keep the current page's strip link in view, centred where there's room.
  function centre(nav: HTMLElement, _key: unknown) {
    const run = () => {
      const el = nav.querySelector<HTMLElement>("[data-mark]");
      if (!el) return;
      const left = el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2;
      nav.scrollTo({ left: Math.max(0, left), behavior: prefersReducedMotion ? "auto" : "smooth" });
    };
    run();
    return { update: run };
  }

  const glideKey = $derived(`${route.id}|${JSON.stringify(opened)}|${[...perms].join()}|${all.length}`);
</script>

{#snippet railLink(r: Route, nested = false, short = false)}
  {@const on = r.id === route.id}
  <a
    class="nav-item"
    class:nested
    class:on
    href={r.path}
    data-mark={on ? "" : undefined}
    aria-current={on ? "page" : undefined}
  >
    <Icon name={r.icon} size={18} />
    <span>{short ? (r.short ?? r.name) : r.name}</span>
  </a>
{/snippet}

<div class="shell" class:focus={route.focus}>
  <aside class="rail" aria-label="Main" inert={route.focus || undefined}>
    <a class="brand" href="/">
      <img src={logo} alt="" width="34" height="34" />
      <span class="brand-text">
        <span class="display brand-title">Cougars</span>
        <span class="brand-sub">Team app</span>
      </span>
    </a>
    <nav class="nav" use:glide={{ shape: rowShape, key: glideKey }}>
      <span class="nav-mark" data-glide aria-hidden="true"></span>
      {#each flat as r (r.id)}{@render railLink(r)}{/each}

      {#each railFolds as f (f.id)}
        {@const open = isOpen(f.id)}
        <div class="group" class:open class:settings={f.id === "settings"}>
          <button
            class="nav-item group-head"
            class:in={foldOf(route) === f.id}
            aria-expanded={open}
            onclick={() => toggle(f.id)}
          >
            <Icon name={f.icon} size={18} />
            <span class="group-name">{f.name}</span>
            <span class="chev"><Icon name="chevronRight" size={16} /></span>
          </button>
          <div class="fold">
            <div class="fold-inner">
              {#each f.groups as g (g.label)}
                {#if g.label}<p class="sub-label">{g.label}</p>{/if}
                {#each g.routes as r (r.id)}{@render railLink(r, true)}{/each}
              {/each}
            </div>
          </div>
        </div>
      {/each}
    </nav>
  </aside>

  <main class="main">
    <header class="chrome" class:bare={route.focus && !impersonating()} bind:clientHeight={chromeH}>
      {#if impersonating()}
        <div class="viewing" role="status">
          <Icon name="eye" size={16} />
          <span class="viewing-text">
            Viewing as <strong>{me().name}</strong>
            <span class="viewing-role">· {rolesOf(me().id).join(", ")} · read-only</span>
          </span>
          <button class="btn sm viewing-back" onclick={() => (viewAs(null), navigate("/"))}>
            Back to {realMember().name.split(" ")[0]}
          </button>
        </div>
      {/if}

      {#if !route.focus}
        <div class="topbar">
          <a class="topbar-brand" href="/" aria-label="Home">
            <img src={logo} alt="" width="28" height="28" />
            <span class="display">Cougars</span>
          </a>
          <nav class="crumbs" aria-label="You are here">
            {#each crumbs as c, i (c)}
              {#if i > 0}<span class="sep" aria-hidden="true">/</span>{/if}
              <span class:here={i === crumbs.length - 1}>{c}</span>
            {/each}
          </nav>
          <AccountMenu />
        </div>
      {/if}

      {#if strip.length}
        <nav
          class="strip"
          aria-label="{tabList.find((t) => t.id === route.tab)?.label} pages"
          use:glide={{ shape: underlineShape, key: glideKey }}
          use:centre={route.id}
        >
          <span class="strip-mark" data-glide aria-hidden="true"></span>
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
    </header>

    <div class="content" bind:this={content} style:--chrome-h="{chromeH}px">
      {#key route.id}
        <div
          class="view"
          class:under-tabs={!route.focus}
          in:enter={{ focus: route.focus }}
          out:leave={{ focus: route.focus }}
        >
          {@render children()}
        </div>
      {/key}
    </div>

    <nav
      class="tabs"
      aria-label="Primary"
      inert={route.focus || undefined}
      use:glide={{ shape: pillShape, key: glideKey }}
    >
      <span class="tab-mark" data-glide aria-hidden="true"></span>
      {#each tabList as tab (tab.id)}
        {@const on = route.tab === tab.id}
        <a
          class="tab"
          class:on
          href={tabHref(all, tab.id, perms, router.last)}
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
    height: var(--topbar-h);
    margin: 0 calc(-1 * var(--s-3)) var(--s-3);
    padding: 0 var(--s-4);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  .brand img,
  .topbar-brand img {
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
    overflow-x: hidden;
    overflow-y: auto;
    /* The bar lives in the rail's right padding: reserve it, then give the width back */
    scrollbar-gutter: stable;
    margin-right: calc(-1 * var(--scrollbar-size));
  }
  .nav-item {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: var(--s-3);
    width: 100%;
    height: 2.625rem;
    flex-shrink: 0;
    padding: 0 var(--s-3);
    border: 0;
    border-radius: var(--r-md);
    background: none;
    color: var(--fg-muted);
    font-size: var(--text-sm);
    font-weight: 500;
    text-align: left;
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
  .nav-item.nested {
    height: 2.375rem;
    padding-left: 2.6rem;
    font-weight: 400;
  }
  .nav-item.nested :global(svg) {
    display: none;
  }
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

  /* Settings folds open and shut (grid-template-rows 0fr ↔ 1fr), so the rows below glide rather than jump */
  .group {
    margin-top: var(--s-1);
  }
  .group.settings {
    margin-top: var(--s-4);
    padding-top: var(--s-3);
    border-top: 1px solid var(--border);
  }
  .group-name {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .group-head.in {
    color: var(--fg);
  }
  .chev {
    display: grid;
    margin-left: auto;
    color: var(--fg-subtle);
    transition: transform var(--t-slow) var(--ease);
  }
  .open .chev {
    transform: rotate(90deg);
  }
  .fold {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    transition:
      grid-template-rows var(--t-slow) var(--ease),
      opacity var(--t-slow) var(--ease);
  }
  .open .fold {
    grid-template-rows: 1fr;
    opacity: 1;
  }
  .fold-inner {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 0;
    overflow: hidden;
  }
  .group:not(.open) .fold-inner {
    visibility: hidden;
    transition: visibility 0s var(--t-slow);
  }
  .sub-label {
    margin: var(--s-2) 0 0 2.6rem;
    font-size: var(--text-2xs);
    font-weight: 600;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--fg-subtle);
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
  /* Views stack, so one can fade out while the next flies in. Each scrolls on its own, under the chrome. */
  .view {
    position: absolute;
    inset: 0;
    padding-top: var(--chrome-h, 0px);
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  /* ─── Chrome: banner, top bar and strip, frosted; content scrolls under it.
     The frost is on a pseudo-element: backdrop-filter on the bar itself would trap the account sheet. ─── */
  .chrome {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 6;
    padding-top: env(safe-area-inset-top, 0px);
  }
  .chrome::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background: var(--chrome-bg);
    backdrop-filter: var(--blur);
    -webkit-backdrop-filter: var(--blur);
    border-bottom: 1px solid var(--border);
  }
  .chrome.bare::before {
    display: none;
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: var(--s-4);
    height: var(--topbar-h);
    padding: 0 var(--gutter);
  }
  .topbar-brand {
    display: none;
    align-items: center;
    gap: var(--s-2);
    font-size: 1.15rem;
    color: var(--fg);
  }
  .crumbs {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    flex: 1;
    min-width: 0;
    color: var(--fg-muted);
    font-size: var(--text-sm);
    font-weight: 500;
    white-space: nowrap;
  }
  .crumbs .sep {
    color: var(--fg-subtle);
  }
  .crumbs .here {
    color: var(--fg);
  }

  .viewing {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    min-height: 2.75rem;
    padding: var(--s-1) var(--gutter);
    background: color-mix(in srgb, var(--amber) 16%, var(--bg));
    border-bottom: 1px solid var(--amber-border);
    color: var(--amber);
    font-size: var(--text-sm);
  }
  .viewing-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .viewing strong {
    color: var(--fg);
    font-weight: 600;
  }
  .viewing-back {
    border-color: var(--amber-border);
    background: var(--amber-wash);
    color: var(--amber);
  }
  .viewing-back:hover {
    background: color-mix(in srgb, var(--amber) 24%, transparent);
  }

  /* ─── Strip of sub-pages (phones; desktop has the rail) ─── */
  .strip {
    position: relative;
    display: flex;
    align-items: stretch;
    gap: var(--s-1);
    height: var(--strip-h);
    padding: 0 calc(var(--gutter) - var(--s-2));
    overflow-x: auto;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
    border-top: 1px solid var(--border);
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
  @media (min-width: 901px) {
    .strip {
      display: none;
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
    .rail,
    .crumbs {
      display: none;
    }
    .topbar {
      justify-content: space-between;
    }
    .topbar-brand {
      display: inline-flex;
    }
    .viewing-role {
      display: none;
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
