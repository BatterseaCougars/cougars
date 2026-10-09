<script lang="ts">
  // Settings → Tournaments: the schedule as a grid, what an admin comes here to scan and change: each one's series,
  // when and where, its fee, sign-up, captains or teams, and where it stands (lib/edition.ts). A row opens that
  // tournament's editor; "New tournament" opens a blank one, which can start from a series' defaults.
  import Icon from "../app/shell/Icon.svelte";
  import PageHeader from "../lib/PageHeader.svelte";
  import TournamentEditorPanel, { editTournament } from "../lib/TournamentEditorPanel.svelte";
  import { tournamentPlace, typeById } from "../demo/schedule.svelte";
  import { db } from "../demo/store.svelte";
  import { londonToday, pounds } from "../lib/dates";
  import { EDITION_LABEL, editionState, editionWhen } from "../lib/edition";
  import type { Tournament } from "../demo/model";

  // Dates still to come first, soonest first; then the finished ones, latest first
  const done = (t: Tournament) => editionState(t) === "done" || t.heldOn < londonToday();
  const dates = $derived(
    [...db.tournaments].sort((a, b) => {
      if (done(a) !== done(b)) return done(a) ? 1 : -1;
      return done(a) ? b.heldOn.localeCompare(a.heldOn) : a.heldOn.localeCompare(b.heldOn);
    }),
  );
  const when = (t: Tournament) => {
    const w = editionWhen(t);
    return { day: w.day ?? (w.tbc ? "Date TBC" : w.season), season: w.day || w.tbc ? w.season : "" };
  };
  // A draft: members say they're in, then captains pick; otherwise teams enter
  const signUp = (t: Tournament) =>
    t.kind === "draft" ? `${t.going.length}${t.capacity ? ` / ${t.capacity}` : ""}` : "—";
  const teams = (t: Tournament) =>
    t.kind === "draft"
      ? t.teams.length
        ? `${t.teams.length} captains`
        : "None yet"
      : `${t.teams.length} ${t.teams.length === 1 ? "team" : "teams"}`;
</script>

<div class="page full">
  <PageHeader title="Tournaments" subtitle="The schedule. Open one to set its day, sign-up, draft and captains.">
    {#snippet actions()}
      <button class="btn primary sm" onclick={() => editTournament("new")}
        ><Icon name="plus" size={16} />New tournament</button
      >
    {/snippet}
  </PageHeader>

  {#if !dates.length}
    <p class="note">No tournaments yet. Add one, on its own or in a series to start from its defaults.</p>
  {:else}
    <div class="scroll">
      <table class="grid">
        <thead>
          <tr>
            <th class="l">Tournament</th>
            <th class="l">When</th>
            <th class="l wide-only">Where</th>
            <th class="r wide-only">Fee</th>
            <th class="r">In</th>
            <th class="l wide-only">Teams</th>
            <th class="l">Stands</th>
            <th aria-label="Open"></th>
          </tr>
        </thead>
        <tbody>
          {#each dates as t (t.id)}
            {@const type = typeById(t.typeId)}
            {@const w = when(t)}
            {@const stage = editionState(t)}
            <tr class:past={done(t)}>
              <td class="l name">
                <button class="open" onclick={() => editTournament(t.id)}>
                  <span class="ico tone" style:--tone="var(--tone-{type?.tone ?? 'red'})"
                    ><Icon name={type?.icon ?? "trophy"} size={18} /></span
                  >
                  <span class="txt">
                    <strong>{t.name}</strong>
                    <span class="sub">{type?.name ?? "On its own"}</span>
                  </span>
                </button>
              </td>
              <td class="l">
                <span class="txt"
                  ><span>{w.day}</span>{#if w.season}<span class="sub">{w.season}</span>{/if}</span
                >
              </td>
              <td class="l wide-only muted">{tournamentPlace(t)?.name ?? "No place yet"}</td>
              <td class="r wide-only num">{t.feePence ? pounds(t.feePence) : "Free"}</td>
              <td class="r num">{signUp(t)}</td>
              <td class="l wide-only muted">{teams(t)}</td>
              <td class="l"><span class="stage {stage}">{EDITION_LABEL[stage]}</span></td>
              <td class="go"><Icon name="chevronRight" size={18} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<TournamentEditorPanel />

<style>
  .scroll {
    overflow-x: auto;
  }
  .grid {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    padding: var(--s-3);
    white-space: nowrap;
    vertical-align: middle;
  }
  thead th {
    padding-bottom: var(--s-2);
    color: var(--fg-muted);
    font-size: var(--text-2xs);
    font-weight: 600;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
  }
  td {
    border-top: 1px solid var(--border);
    color: var(--fg-body);
  }
  /* The whole row opens it: the name's button stretches over the row */
  tbody tr {
    position: relative;
  }
  tbody tr:hover td {
    background: var(--surface-2);
  }
  .open {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .open::after {
    content: "";
    position: absolute;
    inset: 0;
  }
  .ico {
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    flex-shrink: 0;
    border-radius: var(--r-md);
    background: color-mix(in srgb, var(--tone) 18%, transparent);
    color: var(--tone);
  }
  .txt {
    display: grid;
    gap: 0.1rem;
  }
  .txt strong {
    color: var(--fg);
    font-weight: 600;
  }
  .sub,
  .muted {
    color: var(--fg-muted);
    font-size: var(--text-sm);
  }
  .l {
    text-align: left;
  }
  .r {
    text-align: right;
  }
  .num {
    font-variant-numeric: tabular-nums;
  }
  .stage {
    color: var(--fg-muted);
    font-size: var(--text-sm);
    font-weight: 600;
  }
  .stage.live {
    color: var(--red-hot);
  }
  .stage.open {
    color: var(--green-ink);
  }
  .go {
    width: 1px;
    color: var(--fg-subtle);
  }
  .past td {
    color: var(--fg-muted);
  }
  @media (max-width: 900px) {
    .wide-only {
      display: none;
    }
  }
</style>
