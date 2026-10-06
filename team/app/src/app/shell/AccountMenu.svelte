<script lang="ts">
  /**
   * Who's signed in, top right (the Gwenda ops account badge). Opens your account: profile, your tab, sign out,
   * and for admins "View as", which shows the app exactly as a member sees it (ADR 0029). Escape or a click
   * outside closes it. On a phone the menu is a sheet from the bottom.
   */
  import { tick } from "svelte";
  import { can } from "../../access/actions";
  import { db } from "../../demo/store.svelte";
  import { emailFor } from "../../demo/data";
  import { impersonating, me, realGranted, realMember, rolesOf, viewAs } from "../../demo/session.svelte";
  import { initials } from "../../lib/initials";
  import { navigate } from "../router.svelte";
  import Icon from "./Icon.svelte";

  let open = $state(false);
  let picking = $state(false);
  let search = $state("");
  let root = $state<HTMLDivElement | undefined>();
  let trigger = $state<HTMLButtonElement | undefined>();
  let menu = $state<HTMLDivElement | undefined>();

  const shown = $derived(me());
  const canViewAs = $derived(can(realGranted(), "impersonate:Member"));
  const roles = $derived(rolesOf(shown.id));
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
    navigate("/");
  }
  async function startPicking() {
    picking = true;
    await tick();
    menu?.querySelector<HTMLInputElement>("input")?.focus();
  }
</script>

<svelte:window
  onpointerdown={(e) => open && root && !root.contains(e.target as Node) && close()}
  onkeydown={(e) => open && e.key === "Escape" && (e.preventDefault(), close(true))}
/>

<div class="account" bind:this={root}>
  <button
    type="button"
    class="trigger"
    class:as={impersonating()}
    bind:this={trigger}
    aria-haspopup="menu"
    aria-expanded={open}
    aria-label="Account: {shown.name}"
    onclick={toggle}
  >
    <span class="avatar sm" aria-hidden="true">{initials(shown.name)}</span>
    <span class="name">{shown.name.split(" ")[0]}</span>
    <Icon name="chevronDown" size={14} />
  </button>

  {#if open}
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
          ><Icon name="pound" size={16} /> My tab</button
        >
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
        <button class="item" role="menuitem" disabled={impersonating()}
          ><Icon name="signOut" size={16} /> Sign out</button
        >
      {/if}
    </div>
  {/if}
</div>

<style>
  .account {
    position: relative;
    flex-shrink: 0;
  }
  .trigger {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    height: 2.25rem;
    padding: 0 var(--s-2) 0 0.2rem;
    border: 1px solid var(--border-strong);
    border-radius: var(--r-pill);
    background: color-mix(in srgb, var(--surface-2) 55%, transparent);
    color: var(--fg-muted);
    transition:
      border-color var(--t-fast) var(--ease-in-out),
      background-color var(--t-fast) var(--ease-in-out),
      color var(--t-fast) var(--ease-in-out);
  }
  .trigger:hover,
  .trigger[aria-expanded="true"] {
    background: var(--surface-3);
    color: var(--fg);
  }
  .trigger.as {
    border-color: var(--amber-border);
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
  .trigger .avatar {
    border-color: var(--red-border);
    background: var(--red-wash-strong);
    color: var(--fg);
  }
  .trigger.as .avatar {
    border-color: var(--amber-border);
    background: var(--amber-wash);
    color: var(--amber);
  }
  .avatar.big {
    width: 2.75rem;
    height: 2.75rem;
    font-size: var(--text-sm);
  }
  .menu {
    position: absolute;
    z-index: 60;
    top: calc(100% + 8px);
    right: 0;
    display: grid;
    gap: var(--s-1);
    width: 18.5rem;
    padding: var(--s-2);
    border: 1px solid var(--border-strong);
    border-radius: var(--r-lg);
    background: var(--panel-bg-strong);
    backdrop-filter: var(--blur);
    -webkit-backdrop-filter: var(--blur);
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
    font-size: var(--text-xs);
  }

  .scrim {
    display: none;
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
