<script lang="ts">
  // The top of every tournament page: the type as the eyebrow, the page, its status, and which edition it's showing.
  // On the front page (Games), an admin's Manage menu (ADR 0065): this date's editor, its captains, or a new date,
  // open over the page.
  import type { Tournament, TournamentType } from "../demo/model";
  import { can } from "../access/actions";
  import { granted } from "../demo/session.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import PageHeader from "./PageHeader.svelte";
  import TournamentEditorPanel, { editTournament } from "./TournamentEditorPanel.svelte";
  import { tournamentPlace, whenOf } from "../demo/schedule.svelte";

  let {
    type,
    tournament,
    title,
    manage: offer = false,
  }: {
    type: TournamentType;
    tournament?: Tournament;
    title: string;
    /** The series' front page (Games): an admin's Manage menu goes here and nowhere else. */
    manage?: boolean;
  } = $props();

  const STATUS = { planned: "Coming up", open: "Sign-up open", live: "Live", finished: "Finished" } as const;
  const subtitle = $derived(
    tournament
      ? [tournament.name, whenOf(tournament), tournamentPlace(tournament)?.name].filter(Boolean).join(" · ")
      : `No ${type.shortName} scheduled yet.`,
  );
  const admin = $derived(offer && can(granted(), "manage:Tournament"));
  let menuOpen = $state(false);
  let menuRoot = $state<HTMLElement | undefined>();
  function go(action: () => void) {
    menuOpen = false;
    action();
  }
</script>

<div class="tone" style:--tone="var(--tone-{type.tone})">
  <PageHeader {title} eyebrow={type.name} eyebrowIcon={type.icon} {subtitle}>
    {#snippet badge()}
      {#if tournament}
        <span
          class="badge"
          class:red={tournament.status === "live"}
          class:live={tournament.status === "live"}
          class:green={tournament.status === "open"}
        >
          {STATUS[tournament.status]}
        </span>
      {/if}
    {/snippet}
    {#snippet actions()}
      {#if admin}
        <!-- One quiet button on the series' front page (ADR 0065): what an admin does to the series, kept out of the
             way of everyone else's view -->
        <div class="manage" bind:this={menuRoot}>
          <button
            class="btn sm ghost"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onclick={() => (menuOpen = !menuOpen)}><Icon name="settings" size={16} /> Manage</button
          >
          {#if menuOpen}
            <div class="menu panel" role="menu">
              {#if tournament}
                <button class="item" role="menuitem" onclick={() => go(() => editTournament(tournament.id))}
                  >Edit this {type.shortName}</button
                >
                {#if tournament.kind === "draft"}
                  <button
                    class="item"
                    role="menuitem"
                    onclick={() => go(() => editTournament(tournament.id, { tab: "teams" }))}>Captains and draft</button
                  >
                {/if}
              {/if}
              <button class="item" role="menuitem" onclick={() => go(() => editTournament("new", { typeId: type.id }))}
                ><Icon name="plus" size={16} /> New {type.shortName} date</button
              >
            </div>
          {/if}
        </div>
      {/if}
    {/snippet}
  </PageHeader>
</div>

<svelte:window
  onpointerdown={(e) => menuOpen && menuRoot && !menuRoot.contains(e.target as Node) && (menuOpen = false)}
  onkeydown={(e) => menuOpen && e.key === "Escape" && (menuOpen = false)}
/>

{#if can(granted(), "manage:Tournament")}<TournamentEditorPanel />{/if}

<style>
  .tone {
    display: contents;
  }
  .manage {
    position: relative;
  }
  .menu {
    position: absolute;
    top: calc(100% + var(--s-1));
    right: 0;
    z-index: 20;
    display: grid;
    min-width: 13rem;
    padding: var(--s-1);
    border-radius: var(--r-md);
    background: var(--surface-2);
    box-shadow: 0 16px 32px -12px rgb(0 0 0 / 0.7);
  }
  .item {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    padding: var(--s-2) var(--s-3);
    border: 0;
    border-radius: var(--r-sm);
    background: none;
    color: var(--fg);
    font: inherit;
    font-size: var(--text-sm);
    text-align: left;
    cursor: pointer;
  }
  .item:hover,
  .item:focus-visible {
    background: var(--surface-3);
    outline: none;
  }
</style>
