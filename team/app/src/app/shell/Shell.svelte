<script lang="ts">
  // The shell. Desktop: the page has the whole screen; a dock of the main sections floats mid-left, the brand
  // mark top-left, your badge top-right, the wordmark and the London clock in the bottom corners. A section's
  // pages (Games, Standings, Draft) sit as pills along the top. Phones: the Gwenda ops pattern, five tabs at the
  // bottom and a strip of sub-pages under the top bar.
  import { type Snippet } from "svelte";
  import { can } from "../../access/actions";
  import { granted, impersonating, me, realMember, rolesOf, viewAs } from "../../demo/session.svelte";
  import { stripRoutes, tabHref, tabRoutes } from "../mobile-nav";
  import { type Route, type TabId } from "../nav-routes";
  import { folds, routes, tabs } from "../routes.svelte";
  import { navigate, router } from "../router.svelte";
  import { easeOut, flyMs, prefersReducedMotion, zoom } from "../motion";
  import { glide, pillShape, rowShape, stripShape } from "./mark";
  import type { IconName } from "./icons";
  import AccountMenu from "./AccountMenu.svelte";
  import Icon from "./Icon.svelte";
  import logo from "../../assets/cougars-mark.webp";
  import { ledgerFor } from "../../demo/data";
  import { pounds } from "../../lib/dates";

  let { route, children }: { route: Route; children: Snippet } = $props();

  const perms = $derived(granted());
  const all = $derived(routes());
  const tabList = $derived(tabs());
  const strip = $derived(route.focus ? [] : stripRoutes(all, route, perms));
  // Desktop shows the strip only inside a tournament type (Games, Standings, Draft); the dock already lists the
  // trainings.
  const stripOnDesktop = $derived(Boolean(route.fold));
  const allowed = (r: Route) => !r.focus && !r.hidden && can(perms, r.action);

  // The dock: only the main sections. Home, a tile per training, Calendar, a tile per tournament type, the club
  // pages, then Settings (or More, for members with nothing to set up). Everything else is reached from a page.
  interface DockItem {
    id: string;
    name: string;
    icon: IconName;
    href: string;
    on: boolean;
    /** A small count on the tile: what you owe. */
    badge?: string;
  }
  const dock = $derived.by((): DockItem[] => {
    const items: DockItem[] = [];
    const home = all.find((r) => r.id === "home");
    if (home) items.push({ id: home.id, name: home.name, icon: home.icon, href: home.path, on: route.id === home.id });
    for (const r of all.filter((r) => r.tab === "training" && allowed(r))) {
      items.push({
        id: r.id,
        name: r.name,
        icon: r.icon,
        href: r.path,
        on: route.params?.seriesId === r.params?.seriesId && route.tab === "training",
      });
    }
    const cal = all.find((r) => r.tab === "calendar" && allowed(r));
    if (cal) items.push({ id: cal.id, name: cal.name, icon: cal.icon, href: cal.path, on: route.tab === "calendar" });
    for (const f of folds()) {
      const first = all.find((r) => r.fold === f.id && allowed(r));
      if (first) items.push({ id: f.id, name: f.name, icon: f.icon, href: first.path, on: route.fold === f.id });
    }
    for (const r of all.filter((r) => r.group === "Club" && allowed(r))) {
      items.push({ id: r.id, name: r.name, icon: r.icon, href: r.path, on: route.id === r.id });
    }
    // Dues: always there, with what you owe on it until it's paid
    const dues = all.find((r) => r.id === "tab");
    if (dues) {
      const owed = ledgerFor(me().id).reduce((sum, l) => sum + l.pence, 0);
      items.push({
        id: dues.id,
        name: owed > 0 ? `Dues · you owe ${pounds(owed)}` : "Dues",
        icon: dues.icon,
        href: dues.path,
        on: route.id === dues.id,
        badge: owed > 0 ? pounds(owed) : undefined,
      });
    }
    const more = all.find((r) => r.id === "more");
    if (more) {
      const settings = all.some((r) => r.group === "Settings" && allowed(r));
      items.push({
        id: more.id,
        name: settings ? "Settings" : "More",
        icon: settings ? "settings" : "more",
        href: more.path,
        on: route.tab === "more" && route.id !== "tab",
      });
    }
    return items;
  });

  // London time in the corner, to the minute.
  let now = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 15_000);
    return () => clearInterval(t);
  });
  const clock = $derived(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(now),
  );

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

  // Pages slide up as they arrive; full-screen pages zoom in from a blur. No opacity on ordinary pages: a parent
  // below full opacity stops the browser blurring behind the glass cards inside it, so they'd show clear until
  // the fade ended. The page leaving goes at once, so the two never show through each other.
  function enter(node: Element, { focus }: { focus?: boolean }) {
    if (focus) return zoom(node);
    return {
      duration: flyMs,
      easing: easeOut,
      css: (_t: number, u: number) => `transform: translateY(${14 * u}px)`,
    };
  }
  function leave(node: Element, { focus }: { focus?: boolean }) {
    return focus ? zoom(node, { out: true }) : { duration: 0 };
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

  // The poster word behind each page's title: the section it's in (Friday, Kumite), else the page itself.
  const ghost = $derived(
    route.id === "home"
      ? ""
      : route.id === "more"
        ? (dock.find((d) => d.id === "more")?.name ?? route.name)
        : route.fold
          ? (tabList.find((t) => t.id === route.tab)?.label ?? route.name)
          : (route.short ?? route.name),
  );

  const glideKey = $derived(`${route.id}|${[...perms].join()}|${all.length}`);
</script>

<div class="shell" class:focus={route.focus}>
  <!-- Desktop: the dock, floating mid-left -->
  <nav class="dock" aria-label="Main" inert={route.focus || undefined} use:glide={{ shape: rowShape, key: glideKey }}>
    <span class="dock-mark" data-glide aria-hidden="true"></span>
    {#each dock as item (item.id)}
      <a
        class="dock-item"
        class:on={item.on}
        href={item.href}
        data-mark={item.on ? "" : undefined}
        aria-current={item.on ? "page" : undefined}
        aria-label={item.name}
      >
        <Icon name={item.icon} size={22} />
        {#if item.badge}<span class="dock-badge num" aria-hidden="true">{item.badge}</span>{/if}
        <span class="dock-label" aria-hidden="true">{item.name}</span>
      </a>
    {/each}
  </nav>

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
          <a class="brand" href="/" aria-label="Home">
            <img src={logo} alt="" width="28" height="28" />
            <span class="display wordmark">Cougars <span class="meat">Fresh Meat</span></span>
          </a>
          <AccountMenu />
        </div>
      {/if}

      {#if strip.length}
        <nav
          class="strip"
          class:phone-only={!stripOnDesktop}
          aria-label="{tabList.find((t) => t.id === route.tab)?.label} pages"
          use:glide={{ shape: stripShape, key: glideKey }}
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
          {#if ghost && !route.focus}<span class="ghost display" aria-hidden="true">{ghost}</span>{/if}
          {@render children()}
        </div>
      {/key}
    </div>

    <!-- Desktop corners -->
    {#if !route.focus}
      <a class="corner wordmark-corner display" href="/" aria-hidden="true" tabindex="-1">
        <span>Cougars</span><span class="meat">Fresh Meat</span>
      </a>
      <p class="corner clock-corner num" aria-hidden="true">Battersea <strong>{clock}</strong></p>
    {/if}

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
    height: 100dvh;
    overflow: hidden;
  }
  .main {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 0;
    min-height: 0;
  }
  .content {
    position: relative;
    flex: 1;
    min-height: 0;
  }
  /* Views stack, so one can leave while the next slides in. Each scrolls on its own, under the chrome. */
  .view {
    position: absolute;
    inset: 0;
    padding-top: var(--chrome-h, 0px);
    overflow-x: clip;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }
  .view > :global(.page) {
    position: relative;
    z-index: 1;
  }

  /* ─── The dock (desktop): glass tiles, the current one raised; a label slides out on hover ─── */
  .dock {
    position: fixed;
    top: 50%;
    left: var(--s-5);
    z-index: 7;
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    translate: 0 -50%;
    transition:
      translate var(--t-slow) var(--ease),
      opacity var(--t-slow) var(--ease);
  }
  .focus .dock {
    translate: -140% -50%;
    opacity: 0;
  }
  .dock-item {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 3.5rem;
    height: 3.5rem;
    border-radius: var(--r-md);
    border: 1px solid rgb(236 232 225 / 0.07);
    background: color-mix(in srgb, var(--surface-1) 45%, transparent);
    backdrop-filter: blur(14px) saturate(1.4);
    -webkit-backdrop-filter: blur(14px) saturate(1.4);
    color: var(--fg-muted);
    transition:
      color var(--t) var(--ease-in-out),
      scale var(--t) var(--ease),
      border-color var(--t) var(--ease-in-out);
  }
  .dock-item:hover {
    color: var(--fg);
    border-color: rgb(236 232 225 / 0.14);
  }
  .dock-item:active {
    scale: 0.95;
  }
  .dock-item.on {
    color: var(--fg);
    border-color: transparent;
  }
  .dock-item.on :global(svg) {
    color: var(--red-hot);
    filter: drop-shadow(0 0 10px color-mix(in srgb, var(--red) 55%, transparent));
  }
  .dock-item:focus-visible {
    outline-offset: 3px;
  }
  /* The raised tile glides between items */
  .dock-mark {
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    opacity: 0;
    pointer-events: none;
  }
  .dock-mark::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: var(--r-md);
    border: 1px solid rgb(236 232 225 / 0.18);
    background:
      linear-gradient(160deg, rgb(255 255 255 / 0.1), rgb(255 255 255 / 0.02) 60%),
      color-mix(in srgb, var(--surface-2) 85%, transparent);
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.12),
      0 14px 30px -14px rgb(0 0 0 / 0.9);
  }
  .dock-badge {
    position: absolute;
    top: -0.45rem;
    right: -0.55rem;
    padding: 0.1rem 0.35rem;
    border-radius: var(--r-pill);
    background: var(--red);
    color: #fff;
    font-size: 0.65rem;
    font-weight: 700;
    line-height: 1.3;
    box-shadow: 0 0 0 2px var(--bg);
  }
  .dock-label {
    position: absolute;
    left: calc(100% + var(--s-3));
    top: 50%;
    translate: -6px -50%;
    padding: 0.4rem 0.7rem;
    border-radius: var(--r-sm);
    border: 1px solid rgb(236 232 225 / 0.12);
    background: color-mix(in srgb, var(--surface-2) 92%, transparent);
    color: var(--fg);
    font-size: var(--text-2xs);
    font-weight: 700;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    white-space: nowrap;
    box-shadow: var(--shadow);
    opacity: 0;
    pointer-events: none;
    transition:
      opacity var(--t) var(--ease),
      translate var(--t) var(--ease);
  }
  .dock-item:hover .dock-label,
  .dock-item:focus-visible .dock-label {
    opacity: 1;
    translate: 0 -50%;
  }

  /* ─── Chrome: the banner, the top bar and the strip; content scrolls under them ─── */
  .chrome {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 6;
    padding-top: env(safe-area-inset-top, 0px);
  }
  /* Phones frost the bar (content scrolls under it); desktop leaves it clear, the mark and badge just float. The
     frost is on a pseudo-element: backdrop-filter on the bar itself would trap the account sheet. */
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
    justify-content: space-between;
    gap: var(--s-4);
    height: var(--topbar-h);
    padding: 0 var(--gutter);
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    font-size: 1.2rem;
    font-style: italic;
    color: var(--fg);
  }
  .brand img {
    filter: drop-shadow(0 2px 8px rgb(229 19 31 / 0.35));
  }
  .meat {
    color: var(--red-hot);
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

  /* ─── Strip of a section's pages: a row under the bar on phones, floating pills along the top on desktop ─── */
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

  /* ─── The poster word: the page's section in huge outlined capitals behind its title ─── */
  .ghost {
    position: absolute;
    top: calc(var(--chrome-h, 0px) - 0.9rem);
    left: 50%;
    width: min(100%, calc(var(--page-max) + 8rem));
    translate: -50% 0;
    padding-left: 1.5rem;
    overflow: hidden;
    font-size: clamp(5.5rem, 17vw, 10rem);
    font-style: italic;
    line-height: 1;
    white-space: nowrap;
    color: transparent;
    -webkit-text-stroke: 1px color-mix(in srgb, var(--fg) 9%, transparent);
    pointer-events: none;
    user-select: none;
    z-index: 0;
    animation: ghost-in 700ms var(--ease) both;
  }
  @keyframes ghost-in {
    from {
      opacity: 0;
      translate: calc(-50% + 1.5rem) 0;
    }
  }

  /* ─── Desktop corners: the wordmark and the London clock ─── */
  .corner {
    position: absolute;
    bottom: var(--s-5);
    z-index: 6;
    margin: 0;
    color: var(--fg-subtle);
    pointer-events: none;
  }
  .wordmark-corner {
    left: var(--s-5);
    display: grid;
    font-size: 1.05rem;
    font-style: italic;
    line-height: 0.95;
    color: var(--fg-muted);
  }
  .clock-corner {
    right: var(--s-5);
    font-size: var(--text-xs);
  }
  .clock-corner strong {
    color: var(--fg-muted);
    font-weight: 600;
  }

  /* ─── Bottom tabs (phones): frosted, content scrolls under them ─── */
  .tabs {
    display: none;
  }

  @media (min-width: 901px) {
    .chrome::before {
      display: none;
    }
    .wordmark {
      display: none;
    }
    .brand img {
      width: 36px;
      height: 36px;
    }
    .topbar {
      height: 4.5rem;
      padding: 0 var(--s-5);
    }
    .strip {
      position: absolute;
      top: calc(env(safe-area-inset-top, 0px) + 1.1rem);
      left: 50%;
      translate: -50% 0;
      height: auto;
      padding: 3px;
      gap: 2px;
      border: 1px solid rgb(236 232 225 / 0.1);
      border-radius: var(--r-pill);
      background: color-mix(in srgb, var(--surface-1) 55%, transparent);
      backdrop-filter: blur(14px) saturate(1.4);
      -webkit-backdrop-filter: blur(14px) saturate(1.4);
      overflow: visible;
    }
    .strip-link {
      height: 2.1rem;
      padding: 0 var(--s-4);
      border-radius: var(--r-pill);
    }
    .strip-mark {
      background: color-mix(in srgb, var(--fg) 12%, transparent);
    }
    .strip.phone-only {
      display: none;
    }
    /* Room for the dock on narrower desktops, mirrored so the page stays centred */
    .shell:not(.focus) .view {
      padding-left: 6rem;
      padding-right: 6rem;
    }
  }

  @media (max-width: 900px) {
    .dock,
    .corner {
      display: none;
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
      pointer-events: none;
    }
    .tab-mark::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: 999px;
      background: color-mix(in srgb, var(--fg) 10%, transparent);
    }
    .ghost {
      font-size: clamp(4.5rem, 22vw, 6rem);
    }
  }
</style>
