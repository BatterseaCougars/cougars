<script lang="ts">
  /**
   * Who's signed in, top right (the Gwenda ops account badge). Opens your account: profile, your tab, sign out,
   * and for admins "View as", which shows the app exactly as a member sees it (ADR 0029). Escape or a click
   * outside closes it. No drop-down: on a desktop it's a side drawer from the right, on a phone a sheet from the
   * bottom, both moved to the end of the page so they sit
   * above the tabs wherever the badge is placed. `card` draws the trigger as a big row with your email and roles,
   * for the top of More.
   */
  import { tick } from "svelte";
  import { can } from "../../access/actions";
  import { db } from "../../demo/store.svelte";
  import { emailFor } from "../../demo/data";
  import {
    elevated,
    everydayName,
    fullRole,
    hasEveryday,
    impersonating,
    me,
    realGranted,
    realMember,
    setElevated,
    shownRoles,
    viewAs,
  } from "../../demo/session.svelte";
  import { stayIfAllowed } from "../routes.svelte";
  import { initials } from "../../lib/initials";
  import { api } from "../api";
  import { navigate } from "../router.svelte";
  import Icon from "./Icon.svelte";

  let open = $state(false);
  let picking = $state(false);
  let search = $state("");
  let root = $state<HTMLDivElement | undefined>();
  let trigger = $state<HTMLButtonElement | undefined>();
  let menu = $state<HTMLDivElement | undefined>();
  let layer = $state<HTMLDivElement | undefined>();

  let { card = false }: { card?: boolean } = $props();

  // The sheet (phone) and the drawer (desktop) leave the page for <body>: inside it they'd sit under the tabs or bars
  function portal(node: HTMLElement) {
    document.body.append(node);
    return { destroy: () => node.remove() };
  }

  const shown = $derived(me());
  // View as is an admin's tool: not offered while you're in your everyday role
  const canViewAs = $derived(can(realGranted(), "impersonate:Member") && (!hasEveryday() || elevated()));
  const roles = $derived(shownRoles(shown.id));

  // Your full role and your everyday one (ADR 0037). Back to everyday on a page it can't see: Home.
  function toggleMode() {
    const up = !elevated();
    setElevated(up);
    if (!up) stayIfAllowed();
  }
  const members = $derived(
    db.members
      .filter((m) => m.status === "active" && m.player.id !== realMember().id)
      .filter((m) => !search || m.player.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 8),
  );

  async function toggle() {
    open = !open;
    picking = false;
    search = "";
    if (open) {
      await tick();
      menu?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    }
  }
  function close(focusTrigger = false) {
    open = false;
    picking = false;
    if (focusTrigger) trigger?.focus();
  }
  function go(path: string) {
    close();
    navigate(path);
  }
  function become(id: number | null) {
    viewAs(id);
    close();
    stayIfAllowed();
  }
  // Off this device only; the app reloads to the sign-in screen
  async function signOut() {
    close();
    await api("POST", "/api/auth/sign-out").catch(() => {});
    location.replace("/");
  }
  async function startPicking() {
    picking = true;
    await tick();
    menu?.querySelector<HTMLInputElement>("input")?.focus();
  }
</script>

<svelte:window
  onpointerdown={(e) =>
    open && root && !root.contains(e.target as Node) && !layer?.contains(e.target as Node) && close()}
  onkeydown={(e) => open && e.key === "Escape" && (e.preventDefault(), close(true))}
/>

<div class="account" class:wide={card} bind:this={root}>
  <!-- In your everyday role, a switch up to your full one; lit while you're in it (ADR 0037) -->
  {#if hasEveryday() && !card}
    <button
      type="button"
      class="mode"
      class:on={elevated()}
      aria-pressed={elevated()}
      title={elevated() ? `Back to ${everydayName()}` : `Switch to ${fullRole()}`}
      onclick={toggleMode}
    >
      <Icon name="key" size={15} />{fullRole()}
    </button>
  {/if}
  <button
    type="button"
    class="trigger"
    class:card
    class:as={impersonating()}
    bind:this={trigger}
    aria-haspopup="menu"
    aria-expanded={open}
    aria-label="Account: {shown.name}"
    onclick={toggle}
  >
    {#if card}
      <span class="avatar big" aria-hidden="true">{initials(shown.name)}</span>
      <span class="card-text">
        <span class="card-name">{shown.name}</span>
        <span class="hint">{emailFor(shown)} · {roles.join(", ")}</span>
      </span>
      <Icon name="chevronRight" size={18} />
    {:else}
      <span class="avatar sm" aria-hidden="true">{initials(shown.name)}</span>
      <span class="name">{shown.name.split(" ")[0]}</span>
    {/if}
  </button>

  {#if open}
    <div class="layer" bind:this={layer} use:portal>
      <div class="scrim" aria-hidden="true"></div>
      <div class="menu rise" role="menu" aria-label="Account" bind:this={menu}>
        {#if picking}
          <div class="pick-head">
            <button class="btn ghost icon" aria-label="Back" onclick={() => (picking = false)}>
              <Icon name="chevronLeft" size={18} />
            </button>
            <span class="title">View as a member</span>
          </div>
          <input class="input" placeholder="Search members" bind:value={search} />
          <div class="items">
            {#each members as m (m.player.id)}
              <button class="item" role="menuitem" onclick={() => become(m.player.id)}>
                <span class="avatar sm">{initials(m.player.name)}</span>
                <span class="grow">{m.player.name}</span>
                <span class="hint">{m.roles.join(", ")}</span>
              </button>
            {/each}
          </div>
          <p class="hint small">Read-only: you see what they see, and can't change anything as them.</p>
        {:else}
          <div class="who">
            <span class="avatar big" aria-hidden="true">{initials(shown.name)}</span>
            <span class="who-text">
              <span class="title">{shown.name}</span>
              <span class="hint">{emailFor(shown)}</span>
              <span class="roles"
                >{#each roles as r (r)}<span class="badge" class:red={r === "Admin"}>{r}</span>{/each}</span
              >
            </span>
          </div>
          <div class="sep" role="separator"></div>
          <button class="item" role="menuitem" onclick={() => go("/me")}><Icon name="user" size={16} /> Profile</button>
          <button class="item" role="menuitem" onclick={() => go("/me/tab")}
            ><Icon name="pound" size={16} /> Dues</button
          >
          {#if hasEveryday()}
            <div class="sep" role="separator"></div>
            <button class="item" role="menuitem" onclick={() => (toggleMode(), close())}>
              <Icon name="key" size={16} />
              {elevated() ? `Back to ${everydayName()}` : `Switch to ${fullRole()}`}
            </button>
          {/if}
          {#if impersonating()}
            <div class="sep" role="separator"></div>
            <button class="item accent" role="menuitem" onclick={() => become(null)}>
              <Icon name="undo" size={16} /> Back to {realMember().name.split(" ")[0]}
            </button>
          {:else if canViewAs}
            <div class="sep" role="separator"></div>
            <button class="item" role="menuitem" onclick={startPicking}>
              <Icon name="eye" size={16} /> View as a member…
            </button>
          {/if}
          <div class="sep" role="separator"></div>
          <button class="item" role="menuitem" disabled={impersonating()} onclick={signOut}
            ><Icon name="signOut" size={16} /> Sign out</button
          >
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .account {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--s-2);
    flex-shrink: 0;
  }
  /* The switch to your full role: the badge's glass tile, lit red while you're in it */
  .mode {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    height: 2.25rem;
    padding: 0 var(--s-3);
    border: 1px solid rgb(236 232 225 / 0.07);
    border-radius: var(--r-md);
    background: color-mix(in srgb, var(--surface-1) 45%, transparent);
    backdrop-filter: blur(14px) saturate(1.4);
    -webkit-backdrop-filter: blur(14px) saturate(1.4);
    color: var(--fg-muted);
    font-size: var(--text-sm);
    font-weight: 600;
    transition:
      background-color var(--t-fast) var(--ease-in-out),
      color var(--t-fast) var(--ease-in-out);
  }
  .mode:hover {
    background: color-mix(in srgb, var(--surface-3) 90%, transparent);
    color: var(--fg);
  }
  .mode.on {
    border-color: transparent;
    background: color-mix(in srgb, var(--red) 24%, transparent);
    color: var(--red-ink);
  }
  /* The same glass tile as the dock, so the two pieces of chrome match */
  .trigger {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    height: 2.25rem;
    padding: 0 var(--s-2) 0 0.2rem;
    border: 1px solid rgb(236 232 225 / 0.07);
    border-radius: var(--r-md);
    background: color-mix(in srgb, var(--surface-1) 45%, transparent);
    backdrop-filter: blur(14px) saturate(1.4);
    -webkit-backdrop-filter: blur(14px) saturate(1.4);
    color: var(--fg-muted);
    transition:
      border-color var(--t-fast) var(--ease-in-out),
      background-color var(--t-fast) var(--ease-in-out),
      color var(--t-fast) var(--ease-in-out);
  }
  .trigger:hover,
  .trigger[aria-expanded="true"] {
    border-color: rgb(236 232 225 / 0.14);
    background: color-mix(in srgb, var(--surface-3) 90%, transparent);
    color: var(--fg);
  }
  /* The big row at the top of More */
  .trigger.card {
    gap: var(--s-4);
    width: 100%;
    height: auto;
    padding: var(--s-2) var(--s-1);
    border: 0;
    border-radius: var(--r-md);
    background: none;
    text-align: left;
  }
  .trigger.card:hover,
  .trigger.card[aria-expanded="true"] {
    background: none;
  }
  .card-text {
    display: grid;
    flex: 1;
    min-width: 0;
  }
  .card-name {
    color: var(--fg);
    font-size: var(--text-lg);
    font-weight: 600;
  }
  .account.wide {
    width: 100%;
  }
  .layer {
    display: contents;
  }
  .trigger.as {
    border-color: transparent;
    background: var(--amber-wash);
    color: var(--amber);
  }
  .name {
    color: var(--fg);
    font-size: var(--text-sm);
    font-weight: 500;
  }
  .avatar.sm {
    width: 1.75rem;
    height: 1.75rem;
    font-size: 0.65rem;
  }
  .trigger .avatar.sm {
    background: var(--red-wash-strong);
    color: var(--fg);
  }
  .trigger.as .avatar {
    background: var(--amber-wash);
    color: var(--amber);
  }
  /* In the menu's own header, a size down from a page's */
  .menu .avatar.big {
    width: 2.75rem;
    height: 2.75rem;
    font-size: 1.1rem;
  }
  /* A side drawer from the right on a desktop, over a dimmed page */
  .menu {
    position: fixed;
    z-index: 60;
    top: 0;
    right: 0;
    bottom: 0;
    display: grid;
    align-content: start;
    gap: var(--s-1);
    width: min(24rem, 100vw);
    overflow-y: auto;
    padding: max(var(--s-4), env(safe-area-inset-top)) var(--s-3) var(--s-4);
    border-left: 1px solid var(--border-strong);
    background: var(--surface-1);
    box-shadow: var(--shadow-pop);
  }
  .who {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    padding: var(--s-2);
  }
  .who-text {
    display: grid;
    gap: 0.15rem;
    min-width: 0;
  }
  .title {
    color: var(--fg);
    font-weight: 600;
  }
  .roles {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-1);
    margin-top: var(--s-1);
  }
  .sep {
    height: 1px;
    margin: var(--s-1) calc(-1 * var(--s-2));
    background: var(--border);
  }
  .item {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    width: 100%;
    min-height: 2.5rem;
    padding: 0 var(--s-2);
    border: 0;
    border-radius: var(--r-md);
    background: none;
    color: var(--fg-body);
    font-size: var(--text-sm);
    font-weight: 500;
    text-align: left;
    transition:
      background-color var(--t-fast) var(--ease-in-out),
      color var(--t-fast) var(--ease-in-out);
  }
  .item:hover:not(:disabled),
  .item:focus-visible {
    background: color-mix(in srgb, var(--fg) 7%, transparent);
    color: var(--fg);
  }
  .item:disabled {
    color: var(--fg-subtle);
    cursor: not-allowed;
  }
  .item.accent {
    color: var(--amber);
  }
  .item .grow {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .items {
    display: grid;
    max-height: 18rem;
    overflow-y: auto;
  }
  .pick-head {
    display: flex;
    align-items: center;
    gap: var(--s-1);
  }
  .menu .input {
    height: var(--control-h-sm);
    margin: var(--s-1) 0;
  }
  .small {
    padding: var(--s-1) var(--s-2);
  }

  .scrim {
    position: fixed;
    inset: 0;
    z-index: 59;
    background: color-mix(in srgb, var(--bg) 40%, transparent);
    animation: fade-in var(--t) var(--ease) both;
  }

  /* Phones: the menu is a sheet from the bottom, above the tabs */
  @media (max-width: 900px) {
    .scrim {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 59;
      background: color-mix(in srgb, var(--bg) 55%, transparent);
      animation: fade-in var(--t) var(--ease) both;
    }
    .menu {
      position: fixed;
      top: auto;
      left: 0;
      right: 0;
      bottom: 0;
      width: auto;
      padding: var(--s-3) var(--s-3) max(var(--s-4), env(safe-area-inset-bottom));
      border-bottom: 0;
      border-radius: var(--r-xl) var(--r-xl) 0 0;
    }
    .item {
      min-height: 3rem;
      font-size: var(--text-base);
    }
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }
</style>
