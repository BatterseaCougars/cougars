<script lang="ts">
  // Design mockups for desktop navigation (dev only, /mockups/nav). Four structures over the same Friday page,
  // built from the app's real styles, icons and demo data so they can be judged as they'd look. Not wired to
  // the router: clicks in the mock navs only change what's highlighted.
  import Icon from "../app/shell/Icon.svelte";
  import type { IconName } from "../app/shell/icons";
  import logo from "../assets/cougars-mark.webp";
  import { PLAYERS } from "../demo/data";
  import { nextSession, sessionBookable } from "../demo/schedule.svelte";
  import { me } from "../demo/session.svelte";
  import { db } from "../demo/store.svelte";
  import EventCard from "../lib/EventCard.svelte";
  import Person from "../lib/Person.svelte";
  import { formatDayDate, formatTime } from "../lib/dates";

  const OPTIONS = [
    { id: "board", label: "A · Live board rail" },
    { id: "masthead", label: "B · Masthead tabs" },
    { id: "dock", label: "C · Dock + flyout" },
    { id: "command", label: "D · Command bar" },
  ] as const;
  type Option = (typeof OPTIONS)[number]["id"];
  let option = $state<Option>((OPTIONS.find((o) => `#${o.id}` === location.hash)?.id ?? "board") as Option);
  function pick(o: Option) {
    option = o;
    history.replaceState(null, "", `#${o}`);
  }

  const series = db.series[0];
  const session = nextSession(series)!;
  const booking = sessionBookable(session);
  const who = me();
  const at = $derived(session.going.indexOf(who.id));
  const status = $derived(at >= 0 ? `You're in · #${at + 1}` : "Not in yet");
  const when = `${formatDayDate(booking.startsAt)} · ${formatTime(booking.startsAt)}`;
  const fill = $derived(session.going.length / (series.capacity ?? 28));

  const SECTIONS: { id: string; name: string; icon: IconName }[] = [
    { id: "home", name: "Home", icon: "home" },
    { id: "friday", name: "Friday", icon: "stick" },
    { id: "calendar", name: "Calendar", icon: "calendar" },
    { id: "kumite", name: "Kumite", icon: "swords" },
    { id: "teammates", name: "Teammates", icon: "user" },
  ];
  let section = $state("friday");
  let flyout = $state<string | null>("kumite");

  // Command bar: a filtered list of places, people and actions.
  const COMMANDS = [
    { kind: "Pages", label: "Friday Training", hint: "Training", icon: "stick" as IconName },
    { kind: "Pages", label: "Kumite › Standings", hint: "Tournament", icon: "trophy" as IconName },
    { kind: "Pages", label: "Kumite › Draft", hint: "Tournament", icon: "draft" as IconName },
    { kind: "Pages", label: "Calendar", hint: "", icon: "calendar" as IconName },
    { kind: "Pages", label: "Settings › Fees", hint: "Admin", icon: "settings" as IconName },
    { kind: "Actions", label: "Say I'm in for Friday", hint: "Enter", icon: "check" as IconName },
    { kind: "Actions", label: "Open the register", hint: "Door", icon: "list" as IconName },
    { kind: "Actions", label: "Make teams", hint: "Admin", icon: "teams" as IconName },
    ...PLAYERS.slice(0, 12).map((p) => ({ kind: "People", label: p.name, hint: "Teammate", icon: "user" as IconName })),
  ];
  let query = $state("st");
  let paletteOpen = $state(false);
  const results = $derived(
    COMMANDS.filter((c) => !query || c.label.toLowerCase().includes(query.toLowerCase())).slice(0, 8),
  );
  const groups = $derived([...new Set(results.map((r) => r.kind))]);
</script>

{#snippet content()}
  <div class="page">
    <span class="ghost display" aria-hidden="true">Friday</span>
    <div class="page-head">
      <div>
        <h1>Friday Training</h1>
        <p class="hint">Every week on Fri · 19:30–21:30 · The rink</p>
      </div>
    </div>
    <EventCard event={booking} feature />
    <h2 class="section-title">Who's in · first come, first served</h2>
    <div class="list">
      {#each session.going.slice(0, 5) as id (id)}
        <div class="row"><Person player={PLAYERS.find((p) => p.id === id)!} /></div>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet brand()}
  <span class="brand">
    <img src={logo} alt="" width="30" height="30" />
    <span class="display wordmark">Cougars <span class="meat">Fresh Meat</span></span>
  </span>
{/snippet}

<div class="switcher">
  <span class="kicker">Desktop nav mockups</span>
  <div class="seg" role="group" aria-label="Option">
    {#each OPTIONS as o (o.id)}
      <button aria-pressed={option === o.id} onclick={() => pick(o.id)}>{o.label}</button>
    {/each}
  </div>
</div>

<!-- A · The rail is a column of live tiles: each section shows what's happening in it -->
{#if option === "board"}
  <div class="frame board-frame">
    <aside class="board-rail">
      {@render brand()}
      <button class="tile" class:on={section === "home"} onclick={() => (section = "home")}>
        <span class="tile-head"><Icon name="home" size={16} /> Home</span>
        <span class="tile-body">Your tab <strong class="owe">£20</strong></span>
      </button>
      <button class="tile big" class:on={section === "friday"} onclick={() => (section = "friday")}>
        <span class="tile-head"><Icon name="stick" size={16} /> Friday <span class="tile-when">{when}</span></span>
        <span class="tile-body"><strong class:ok={at >= 0}>{status}</strong></span>
        <span class="meter"><span style:width="{fill * 100}%"></span></span>
        <span class="tile-foot num">{session.going.length} / {series.capacity} in</span>
      </button>
      <button class="tile" class:on={section === "kumite"} onclick={() => (section = "kumite")}>
        <span class="tile-head"
          ><Icon name="swords" size={16} /> Kumite <span class="badge red live tiny">Live</span></span
        >
        <span class="tile-body score display">Red 1 – 0 Black</span>
        <span class="tile-foot">Game 3 of 6 · Red top</span>
      </button>
      <button class="tile" class:on={section === "calendar"} onclick={() => (section = "calendar")}>
        <span class="tile-head"><Icon name="calendar" size={16} /> Calendar</span>
        <span class="tile-body">End-of-season drinks</span>
        <span class="tile-foot">Wed 21 Oct</span>
      </button>
      <button class="tile" class:on={section === "teammates"} onclick={() => (section = "teammates")}>
        <span class="tile-head"><Icon name="user" size={16} /> Teammates</span>
        <span class="tile-body">{PLAYERS.length} players</span>
      </button>
      <span class="grow"></span>
      <button class="plain-row"><Icon name="settings" size={16} /> Settings</button>
    </aside>
    <main class="frame-main">{@render content()}</main>
  </div>

  <!-- B · No rail: a masthead with the sections as big tabs, and a context line for the one you're in -->
{:else if option === "masthead"}
  <div class="frame masthead-frame">
    <header class="masthead">
      <div class="mast-row">
        {@render brand()}
        <nav class="mast-tabs">
          {#each SECTIONS as s (s.id)}
            <button class="display mast-tab" class:on={section === s.id} onclick={() => (section = s.id)}>
              {s.name}
            </button>
          {/each}
        </nav>
        <span class="mast-end">
          <button class="btn ghost icon" aria-label="Settings"><Icon name="settings" size={18} /></button>
          <span class="avatar sm">AM</span>
        </span>
      </div>
      <div class="mast-context">
        {#if section === "kumite"}
          <span>Games</span><span class="on">Standings</span><span>Draft</span>
          <span class="ctx-right"><span class="badge red live">Live</span> Red 1–0 Black · Game 3</span>
        {:else}
          <span class="on">This Friday</span><span>Teams</span><span>Past sessions</span>
          <span class="ctx-right">{when} · <strong class:ok={at >= 0}>{status}</strong></span>
        {/if}
      </div>
    </header>
    <main class="frame-main">{@render content()}</main>
  </div>

  <!-- C · A slim dock of sections; one opens a flyout with its pages and a live preview -->
{:else if option === "dock"}
  <div class="frame dock-frame">
    <aside class="dock">
      <img class="dock-logo" src={logo} alt="" width="34" height="34" />
      {#each SECTIONS as s (s.id)}
        <button
          class="dock-item"
          class:on={section === s.id}
          class:open={flyout === s.id}
          onclick={() => (flyout = flyout === s.id ? null : s.id)}
        >
          <Icon name={s.icon} size={22} />
          <span>{s.name}</span>
        </button>
      {/each}
      <span class="grow"></span>
      <button class="dock-item"><Icon name="settings" size={22} /><span>Settings</span></button>
    </aside>
    {#if flyout}
      <div class="flyout panel glass">
        {#if flyout === "kumite"}
          <p class="kicker">The Cougars Kumite</p>
          <h2 class="display fly-title">Autumn Kumite</h2>
          <div class="fly-live">
            <span class="badge red live">Live · Game 3</span>
            <span class="display fly-score">Red 1 – 0 Black</span>
          </div>
          <div class="list">
            <button class="row"><Icon name="list" size={18} /><span class="grow">Games</span></button>
            <button class="row"><Icon name="trophy" size={18} /><span class="grow">Standings</span></button>
            <button class="row"><Icon name="draft" size={18} /><span class="grow">Draft</span></button>
          </div>
          <p class="hint">Next: Winter Kumite · Sun 1 Dec</p>
        {:else}
          <p class="kicker">{SECTIONS.find((s) => s.id === flyout)?.name}</p>
          <h2 class="display fly-title">Friday Training</h2>
          <p class="hint">{when}</p>
          <p><strong class:ok={at >= 0}>{status}</strong></p>
          <div class="list">
            <button class="row"><Icon name="stick" size={18} /><span class="grow">This Friday</span></button>
            <button class="row"><Icon name="teams" size={18} /><span class="grow">Teams</span></button>
          </div>
        {/if}
      </div>
    {/if}
    <main class="frame-main">{@render content()}</main>
  </div>

  <!-- D · A command bar: type to go anywhere (pages, people, actions); sections as chips -->
{:else}
  <div class="frame command-frame">
    <header class="cmd-bar">
      {@render brand()}
      <label class="cmd-box">
        <Icon name="search" size={18} />
        <input placeholder="Go to… pages, teammates, actions" bind:value={query} onfocus={() => (paletteOpen = true)} />
        <kbd>/</kbd>
      </label>
      <span class="avatar sm">AM</span>
      {#if paletteOpen}
        <div class="palette panel glass">
          {#each groups as g (g)}
            <p class="pal-group">{g}</p>
            {#each results.filter((r) => r.kind === g) as r, i (r.label)}
              <button class="pal-item" class:first={g === groups[0] && i === 0} onclick={() => (paletteOpen = false)}>
                <Icon name={r.icon} size={16} />
                <span class="grow">{r.label}</span>
                <span class="hint">{r.hint}</span>
              </button>
            {/each}
          {:else}
            <p class="hint pal-empty">Nothing matches “{query}”.</p>
          {/each}
        </div>
      {/if}
    </header>
    <nav class="cmd-chips">
      {#each SECTIONS as s (s.id)}
        <button class="chip" class:on={section === s.id} onclick={() => (section = s.id)}>
          <Icon name={s.icon} size={15} />
          {s.name}
        </button>
      {/each}
    </nav>
    <main class="frame-main">{@render content()}</main>
  </div>
{/if}

<style>
  .switcher {
    position: fixed;
    inset: 0 0 auto;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: var(--s-4);
    height: 3.25rem;
    padding: 0 var(--s-4);
    border-bottom: 1px solid var(--border-strong);
    background: #000;
  }
  .switcher .seg button {
    min-height: 2rem;
    font-size: var(--text-xs);
  }
  .frame {
    position: fixed;
    inset: 3.25rem 0 0;
    display: grid;
    overflow: hidden;
  }
  .frame-main {
    position: relative;
    overflow-y: auto;
    overflow-x: clip;
  }
  .frame-main .page {
    position: relative;
    padding-top: var(--s-8);
  }
  .ghost {
    position: absolute;
    top: 0.5rem;
    left: -1rem;
    font-size: 10rem;
    font-style: italic;
    line-height: 1;
    white-space: nowrap;
    color: transparent;
    -webkit-text-stroke: 1px color-mix(in srgb, var(--fg) 9%, transparent);
    pointer-events: none;
    z-index: -1;
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    white-space: nowrap;
  }
  .wordmark {
    font-size: 1.3rem;
    font-style: italic;
    color: var(--fg);
  }
  .meat {
    color: var(--red-hot);
  }
  .grow {
    flex: 1;
  }
  .ok {
    color: var(--green);
  }
  button {
    font: inherit;
    color: inherit;
  }

  /* ─── A · Live board rail ─── */
  .board-frame {
    grid-template-columns: 19rem 1fr;
  }
  .board-rail {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    padding: var(--s-4) var(--s-3);
    border-right: 1px solid var(--border);
    background: linear-gradient(180deg, #111114, #0b0b0d);
    overflow-y: auto;
  }
  .board-rail .brand {
    padding: 0 var(--s-2) var(--s-3);
  }
  .tile {
    display: grid;
    gap: 0.3rem;
    padding: var(--s-3) var(--s-4);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: color-mix(in srgb, var(--surface-1) 50%, transparent);
    text-align: left;
    cursor: pointer;
    transition:
      border-color var(--t) var(--ease-in-out),
      background-color var(--t) var(--ease-in-out),
      translate var(--t) var(--ease);
  }
  .tile:hover {
    border-color: var(--border-strong);
    translate: 2px 0;
  }
  .tile.on {
    border-color: rgb(236 232 225 / 0.22);
    background:
      linear-gradient(180deg, rgb(255 255 255 / 0.06), transparent 70%),
      color-mix(in srgb, var(--surface-2) 70%, transparent);
    box-shadow:
      inset 2px 0 0 var(--red),
      0 10px 24px -16px #000;
  }
  .tile-head {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    font-size: var(--text-2xs);
    font-weight: 700;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--fg-subtle);
  }
  .tile.on .tile-head {
    color: var(--fg-muted);
  }
  .tile-when {
    margin-left: auto;
    font-weight: 500;
    letter-spacing: 0;
    text-transform: none;
  }
  .tile-body {
    font-size: var(--text-sm);
    color: var(--fg);
  }
  .tile-foot {
    font-size: var(--text-xs);
    color: var(--fg-subtle);
  }
  .score {
    font-size: 1.35rem;
  }
  .owe {
    color: var(--red-hot);
  }
  .meter {
    height: 3px;
    border-radius: 2px;
    background: color-mix(in srgb, var(--fg) 9%, transparent);
    overflow: hidden;
  }
  .meter span {
    display: block;
    height: 100%;
    background: color-mix(in srgb, var(--fg) 55%, transparent);
  }
  .tiny {
    height: 1.2rem;
    margin-left: auto;
    font-size: 0.65rem;
  }
  .plain-row {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    padding: var(--s-2) var(--s-3);
    border: 0;
    background: none;
    color: var(--fg-muted);
    font-size: var(--text-sm);
  }

  /* ─── B · Masthead ─── */
  .masthead-frame {
    grid-template-rows: auto 1fr;
  }
  .masthead {
    border-bottom: 1px solid var(--border);
    background: linear-gradient(180deg, #121215, #0c0c0e);
  }
  .mast-row {
    display: flex;
    align-items: center;
    gap: var(--s-6);
    height: 4.5rem;
    padding: 0 var(--s-6);
  }
  .mast-tabs {
    display: flex;
    gap: var(--s-1);
    height: 100%;
    margin: 0 auto;
  }
  .mast-tab {
    position: relative;
    font-family: var(--font-display);
    text-transform: uppercase;
    letter-spacing: 0.01em;
    padding: 0 var(--s-4);
    border: 0;
    background: none;
    font-size: 1.5rem;
    color: color-mix(in srgb, var(--fg) 40%, transparent);
    cursor: pointer;
    transition: color var(--t) var(--ease-in-out);
  }
  .mast-tab:hover {
    color: var(--fg-muted);
  }
  .mast-tab.on {
    color: var(--fg);
  }
  .mast-tab.on::after {
    content: "";
    position: absolute;
    left: var(--s-4);
    right: var(--s-4);
    bottom: 0;
    height: 3px;
    border-radius: 3px 3px 0 0;
    background: var(--red);
  }
  .mast-end {
    display: flex;
    align-items: center;
    gap: var(--s-3);
  }
  .mast-context {
    display: flex;
    align-items: center;
    gap: var(--s-5);
    height: 2.75rem;
    padding: 0 var(--s-6);
    border-top: 1px solid var(--border);
    background: color-mix(in srgb, var(--bg) 60%, transparent);
    font-size: var(--text-sm);
    color: var(--fg-subtle);
  }
  .mast-context .on {
    color: var(--fg);
    font-weight: 600;
  }
  .ctx-right {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    margin-left: auto;
    color: var(--fg-muted);
  }

  /* ─── C · Dock + flyout ─── */
  .dock-frame {
    grid-template-columns: 5.25rem 1fr;
  }
  .dock {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--s-1);
    padding: var(--s-4) 0;
    border-right: 1px solid var(--border);
    background: #0b0b0d;
    z-index: 3;
  }
  .dock-logo {
    margin-bottom: var(--s-4);
  }
  .dock-item {
    display: grid;
    justify-items: center;
    gap: 0.3rem;
    width: 4.25rem;
    padding: var(--s-3) 0;
    border: 0;
    border-radius: var(--r-md);
    background: none;
    color: var(--fg-subtle);
    font-size: 0.65rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      color var(--t) var(--ease-in-out),
      background-color var(--t) var(--ease-in-out);
  }
  .dock-item:hover {
    color: var(--fg);
  }
  .dock-item.on {
    color: var(--fg);
  }
  .dock-item.on :global(svg) {
    color: var(--red-hot);
  }
  .dock-item.open {
    background: color-mix(in srgb, var(--fg) 9%, transparent);
    color: var(--fg);
  }
  .flyout {
    position: absolute;
    top: var(--s-3);
    bottom: var(--s-3);
    left: calc(5.25rem + var(--s-2));
    z-index: 2;
    display: grid;
    align-content: start;
    gap: var(--s-4);
    width: 19rem;
    padding: var(--s-5);
    animation: fly-out 260ms var(--ease) both;
  }
  @keyframes fly-out {
    from {
      transform: translateX(-12px);
    }
  }
  .fly-title {
    font-size: 1.8rem;
    font-style: italic;
  }
  .fly-live {
    display: grid;
    gap: var(--s-2);
    justify-items: start;
  }
  .fly-score {
    font-size: 1.6rem;
    color: var(--fg);
  }

  /* ─── D · Command bar ─── */
  .command-frame {
    grid-template-rows: auto auto 1fr;
  }
  .cmd-bar {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--s-6);
    height: 4.25rem;
    padding: 0 var(--s-6);
    background: #0c0c0e;
  }
  .cmd-box {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    width: min(40rem, 100%);
    height: 2.75rem;
    margin: 0 auto;
    padding: 0 var(--s-4);
    border: 1px solid var(--border-strong);
    border-radius: var(--r-md);
    background: color-mix(in srgb, var(--surface-1) 80%, transparent);
    color: var(--fg-subtle);
  }
  .cmd-box:focus-within {
    border-color: var(--fg-subtle);
  }
  .cmd-box input {
    flex: 1;
    border: 0;
    background: none;
    color: var(--fg);
    font: inherit;
    outline: 0;
  }
  kbd {
    padding: 0.1rem 0.45rem;
    border: 1px solid var(--border-strong);
    border-radius: 4px;
    font-size: var(--text-xs);
  }
  .palette {
    position: absolute;
    top: 3.75rem;
    left: 50%;
    z-index: 5;
    width: min(40rem, 90vw);
    translate: -50% 0;
    padding: var(--s-2);
    box-shadow: var(--shadow-pop);
  }
  .pal-group {
    padding: var(--s-2) var(--s-3) var(--s-1);
    font-size: var(--text-2xs);
    font-weight: 700;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--fg-subtle);
  }
  .pal-item {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    width: 100%;
    height: 2.5rem;
    padding: 0 var(--s-3);
    border: 0;
    border-radius: var(--r-sm);
    background: none;
    font-size: var(--text-sm);
    text-align: left;
    cursor: pointer;
  }
  .pal-item:hover,
  .pal-item.first {
    background: color-mix(in srgb, var(--fg) 8%, transparent);
  }
  .pal-empty {
    padding: var(--s-3);
  }
  .cmd-chips {
    display: flex;
    justify-content: center;
    gap: var(--s-2);
    padding: var(--s-2) var(--s-6) var(--s-3);
    border-bottom: 1px solid var(--border);
    background: #0c0c0e;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    height: 2rem;
    padding: 0 var(--s-4);
    border: 1px solid var(--border);
    border-radius: 999px;
    background: none;
    color: var(--fg-muted);
    font-size: var(--text-sm);
    cursor: pointer;
  }
  .chip.on {
    border-color: var(--border-strong);
    background: color-mix(in srgb, var(--fg) 10%, transparent);
    color: var(--fg);
  }
  .chip.on :global(svg) {
    color: var(--red-hot);
  }
</style>
