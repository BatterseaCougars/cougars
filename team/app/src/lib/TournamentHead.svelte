<script lang="ts">
  // The top of every tournament page: the type as the eyebrow, the page, and the edition it's showing, big: its day
  // (or Date to be confirmed), its season, its hours and place, and where it stands, worked out from what's happened
  // (lib/edition.ts). Past ones are on History, each with a page of its own.
  // On the front page (The Kumite), an admin's Manage menu (ADR 0065): this date's editor, its captains, or a new date,
  // open over the page.
  import type { Tournament, TournamentType } from "../demo/model";
  import { can } from "../access/actions";
  import { granted } from "../demo/session.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import PageHeader from "./PageHeader.svelte";
  import TournamentEditorPanel, { editTournament } from "./TournamentEditorPanel.svelte";
  import { tournamentPlace } from "../demo/schedule.svelte";
  import { EDITION_LABEL, editionState, editionWhen } from "./edition";
  import AwardsDrawer, { enterAwards } from "./AwardsDrawer.svelte";
  import Sheet from "./Sheet.svelte";
  import Drawer from "./Drawer.svelte";
  import { phone } from "./viewport.svelte";
  import { navigate } from "../app/router.svelte";
  import type { IconName } from "../app/shell/icons";

  let {
    type,
    tournament,
    title,
    manage: offer = false,
    note,
  }: {
    type: TournamentType;
    tournament?: Tournament;
    title: string;
    /** The series' front page (The Kumite): an admin's Manage menu goes here and nowhere else. */
    manage?: boolean;
    /** In place of the date line, for a page about the series rather than one of its dates (History). */
    note?: string;
  } = $props();

  const stage = $derived(tournament ? editionState(tournament) : null);
  const when = $derived(tournament ? editionWhen(tournament) : null);
  const place = $derived(tournament ? tournamentPlace(tournament)?.name : undefined);
  const admin = $derived(offer && can(granted(), "manage:Tournament"));
  interface Tool {
    icon: IconName;
    label: string;
    sub: string;
    run: () => void;
  }
  let menuOpen = $state(false);
  // Everything an admin does to this edition, in one place: a bottom sheet on a phone (where it's mostly done, at the
  // rink), a side drawer on a desktop. The job of the moment first: the awards once it's done, the fight card on the day
  const tools = $derived.by(() => {
    if (!tournament) return [] as Tool[];
    const t = tournament;
    const slug = `/tournaments/${type.slug}`;
    const list: (Tool & { rank: number })[] = [];
    if (t.awards.length)
      list.push({
        icon: "medal",
        label: "Confirm the awards",
        sub: "From the results; the Dim Mak's a draw",
        run: () => enterAwards(t.id),
        rank: stage === "done" ? 0 : 5,
      });
    list.push({
      icon: type.slug === "kumite" ? "gong" : "calendar",
      label: t.games?.length ? "Fight card and results" : "Make the fight card",
      sub: t.games?.length ? "Each game: score it, or put a result right" : "The games, from the teams",
      run: () => navigate(`${slug}/schedule`),
      rank: stage === "live" ? 0 : 2,
    });
    if (t.kind === "draft") {
      if (t.draftState !== "closed")
        list.push({
          icon: "draft",
          label: "Run the draft",
          sub: "Open it, picks, close it",
          run: () => navigate(`${slug}/draft`),
          rank: 1,
        });
      list.push({
        icon: "teams",
        label: "Captains and draft date",
        sub: "Who picks, and when",
        run: () => editTournament(t.id, { tab: "teams" }),
        rank: 3,
      });
    }
    list.push({
      icon: "settings",
      label: `Edit this ${type.shortName}`,
      sub: "Date, place, sign-up, rules, awards",
      run: () => editTournament(t.id),
      rank: 4,
    });
    list.push({
      icon: "plus",
      label: `New ${type.shortName} date`,
      sub: "The next one",
      run: () => editTournament("new", { typeId: type.id }),
      rank: 6,
    });
    return list.sort((a, b) => a.rank - b.rank);
  });
  function go(action: () => void) {
    menuOpen = false;
    action();
  }
</script>

<div class="tone" style:--tone="var(--tone-{type.tone})">
  <PageHeader {title} eyebrow={type.name} eyebrowIcon={type.icon}>
    {#snippet badge()}
      {#if stage}
        <!-- Where it stands, as a stamp (the Kumite's hanko, in the club's display face): cream done, red on, green open -->
        <span class="stamp {stage}">
          {EDITION_LABEL[stage]}
        </span>
      {/if}
    {/snippet}
    {#snippet sub()}
      <!-- Always the same two lines, on every page of the series, so the tabs under it never move: the day big (or
           that it's to be confirmed), then the season, hours and place -->
      <span class="when-box">
        {#if note}
          <span class="day-line"><span class="aside">{note}</span></span>
          <span class="where">&nbsp;</span>
        {:else if tournament && when}
          <span class="day-line"
            ><span class="day display">{when.day ?? (when.tbc ? "Date to be confirmed" : when.season)}</span></span
          >
          <span class="where"
            >{[when.day || when.tbc ? when.season : "", when.hours, place].filter(Boolean).join(" · ")}</span
          >
        {:else}
          <span class="day-line"><span class="aside">No {type.shortName} scheduled yet.</span></span>
          <span class="where">&nbsp;</span>
        {/if}
      </span>
    {/snippet}
    {#snippet actions()}
      {#if admin}
        <!-- One quiet button on the series' front page (ADR 0065): what an admin does to the series, kept out of the
             way of everyone else's view -->
        <div class="manage">
          <button class="btn sm ghost" aria-haspopup="dialog" onclick={() => (menuOpen = true)}
            ><Icon name="settings" size={16} /> Manage</button
          >
        </div>
      {/if}
    {/snippet}
  </PageHeader>
</div>

{#snippet toolList()}
  <div class="tools">
    {#each tools as tool (tool.label)}
      <button class="tool" onclick={() => go(tool.run)}>
        <Icon name={tool.icon} size={22} />
        <span class="tool-text"><strong>{tool.label}</strong><span>{tool.sub}</span></span>
        <Icon name="chevronRight" size={18} />
      </button>
    {/each}
    {#if !tournament}
      <button class="tool" onclick={() => go(() => editTournament("new", { typeId: type.id }))}>
        <Icon name="plus" size={22} />
        <span class="tool-text"><strong>New {type.shortName} date</strong><span>The next one</span></span>
      </button>
    {/if}
  </div>
{/snippet}

{#if admin}
  <!-- Every admin job for this one, thumb-sized: up from the bottom on a phone, a side drawer on a desktop -->
  {#if phone.current}
    <Sheet bind:open={menuOpen} title="Manage the {type.shortName}">{@render toolList()}</Sheet>
  {:else}
    <Drawer bind:open={menuOpen} title="Manage the {type.shortName}" sub={tournament?.name}>{@render toolList()}</Drawer
    >
  {/if}
{/if}
{#if can(granted(), "manage:Tournament")}<AwardsDrawer />{/if}

{#if can(granted(), "manage:Tournament")}<TournamentEditorPanel />{/if}

<style>
  .tone {
    display: contents;
  }
  .manage {
    position: relative;
  }
  .stamp {
    display: inline-flex;
    align-items: center;
    align-self: center;
    padding: 0.2rem 0.6rem 0.15rem;
    border: 2.5px solid currentColor;
    border-radius: 0.3rem;
    color: var(--fg-muted);
    font-family: var(--font-display);
    font-size: 1.35rem;
    line-height: 1;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    transform: rotate(-4deg);
  }
  .stamp.done {
    color: var(--primary);
  }
  .stamp.live {
    color: var(--red-hot);
  }
  .stamp.open {
    color: var(--green-ink);
  }
  /* On a phone it sits in the eyebrow line: no taller than the line, so the header's height never changes */
  @media (max-width: 900px) {
    .stamp {
      padding: 0.05rem 0.4rem 0;
      border-width: 1.5px;
      font-size: 0.85rem;
    }
  }
  /* Two fixed lines: the same height whatever's in them, so nothing below moves from page to page */
  .when-box {
    display: grid;
    grid-template-rows: 2.2rem 1.5rem;
    gap: var(--s-1);
  }
  .day-line,
  .where {
    display: flex;
    align-items: flex-end;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .day {
    overflow: hidden;
    color: var(--fg);
    font-size: clamp(1.4rem, 3.5vw, 1.9rem);
    line-height: 1.1;
    text-overflow: ellipsis;
  }
  .aside {
    color: var(--fg-muted);
  }
  .where {
    align-items: center;
    color: var(--fg-muted);
  }
  .tools {
    display: grid;
    gap: var(--s-2);
  }
  .tool {
    display: flex;
    align-items: center;
    gap: var(--s-4);
    min-height: 4.25rem;
    padding: var(--s-3) var(--s-4);
    border: 0;
    border-radius: var(--r-lg);
    background: var(--surface-2);
    color: var(--fg-muted);
    font: inherit;
    text-align: left;
  }
  .tool:active {
    background: var(--surface-3);
  }
  .tool-text {
    display: grid;
    flex: 1;
    gap: 0.15rem;
    min-width: 0;
  }
  .tool-text strong {
    color: var(--fg);
    font-size: var(--text-md);
    font-weight: 600;
  }
  .tool-text span {
    font-size: var(--text-sm);
  }
</style>
