<script lang="ts">
  // A series' past ones (ADR 0074), newest first, each with how it ended: the day, the champions, the final's score.
  // Each opens its own page (Edition): the champions, every fight, the board, the awards; back comes here.
  import { shortNameOf } from "../lib/names";
  import EmptyState from "../lib/EmptyState.svelte";
  import { PLAYERS } from "../demo/data";
  import type { Tournament } from "../demo/model";
  import { pastTournaments, typeById } from "../demo/schedule.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import TeamCrest from "../lib/TeamCrest.svelte";
  import TournamentHead from "../lib/TournamentHead.svelte";
  import Kanji from "../lib/Kanji.svelte";
  import { championOf, editionWhen } from "../lib/edition";
  import { kanjiFor } from "../lib/motif";
  import { teamTone } from "../lib/team-tones";

  let { typeId }: { typeId: number } = $props();

  const type = $derived(typeById(typeId)!);
  const past = $derived(pastTournaments(typeId));
  const nameOf = (t: Tournament, id: number | null) => {
    const team = t.teams.find((x) => x.id === id);
    const c = PLAYERS.find((p) => p.id === team?.captainMemberId);
    return team ? team.name || `Team ${shortNameOf(c)}` : "";
  };
  // How it ended, in a line: the final, else the top of the table
  const summary = (t: Tournament) => {
    const champ = championOf(t);
    const playoffs = (t.games ?? []).filter((g) => g.stage === "playoff");
    if (champ && playoffs.length) {
      const f = playoffs.reduce((a, b) => (b.position > a.position ? b : a));
      const home = f.homeTeamId === champ;
      const [us, them] = home ? [f.homeGoals, f.awayGoals] : [f.awayGoals, f.homeGoals];
      return `Beat ${nameOf(t, home ? f.awayTeamId : f.homeTeamId)} ${us}–${them} in the final`;
    }
    return champ ? "Top of the table" : `${(t.games ?? []).length} fights`;
  };
</script>

<div class="page">
  <TournamentHead {type} title="History" note="Every {type.shortName} so far, and who won it." />

  {#if !past.length}
    <EmptyState icon="swords" title="No history yet">The first one's history in the making.</EmptyState>
  {:else}
    <h2 class="section-title">Past {type.shortName}s<Kanji text={kanjiFor(type, "martial")} /></h2>
    <ol class="past">
      {#each past as t (t.id)}
        {@const champ = championOf(t)}
        {@const ci = t.teams.findIndex((x) => x.id === champ)}
        {@const w = editionWhen(t)}
        <li>
          <a class="edition" href="/tournaments/{type.slug}/history/{t.id}">
            {#if ci >= 0}
              <TeamCrest name={nameOf(t, champ)} logo={t.teams[ci].logo} tone={teamTone(ci)} size="3.5rem" />
            {:else}
              <span class="no-crest"><Icon name={type.icon} size={24} /></span>
            {/if}
            <span class="text">
              <span class="eyebrow">{w.day ?? w.season}</span>
              <span class="champ display">{champ ? `${nameOf(t, champ)} won it` : t.name}</span>
              <span class="hint">{summary(t)}</span>
            </span>
            <Icon name="chevronRight" size={20} />
          </a>
        </li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  .past {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .past li + li {
    border-top: 1px solid var(--border);
  }
  .edition {
    display: flex;
    align-items: center;
    gap: var(--s-4);
    padding: var(--s-4) var(--s-1);
    color: var(--fg-muted);
  }
  .edition:hover .champ {
    color: var(--fg);
  }
  .no-crest {
    display: grid;
    place-items: center;
    width: 3.5rem;
    height: 3.5rem;
  }
  .text {
    display: grid;
    flex: 1;
    gap: 0.2rem;
    min-width: 0;
  }
  .champ {
    overflow: hidden;
    color: var(--fg);
    font-size: 1.5rem;
    line-height: 1.05;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
