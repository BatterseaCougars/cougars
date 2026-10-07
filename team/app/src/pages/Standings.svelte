<script lang="ts">
  import { MATCHES, SAMPLE_TOURNAMENT_ID, leaders, standings } from "../demo/kumite";
  import { currentTournament, typeById } from "../demo/schedule.svelte";
  import TournamentHead from "../lib/TournamentHead.svelte";

  let { typeId }: { typeId: number } = $props();

  const type = $derived(typeById(typeId)!);
  const tournament = $derived(currentTournament(typeId));
  const matches = $derived(tournament?.id === SAMPLE_TOURNAMENT_ID ? MATCHES : []);
  // This tournament's own points (ADR 0049), else the series'
  const rules = $derived(tournament ?? type);
  const points = $derived({ win: rules.pointsWin, draw: rules.pointsDraw, loss: rules.pointsLoss });
  const table = $derived(standings(matches, points));
  const top = $derived(leaders(matches).slice(0, 8));
</script>

<div class="page">
  <TournamentHead {type} {tournament} title="Standings" />

  <div class="list">
    <table class="num">
      <thead><tr><th class="l">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
      <tbody>
        {#each table as r, i (r.team.id)}
          <tr class:top={i === 0}>
            <td class="l"><span class="pos">{i + 1}</span>{r.team.name}</td>
            <td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td>
            <td>{r.gf - r.ga > 0 ? "+" : ""}{r.gf - r.ga}</td>
            <td class="pts">{r.pts}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="hint">
    Points, then goal difference, then goals for. Win {rules.pointsWin}, draw {rules.pointsDraw}, loss
    {rules.pointsLoss}: set under Settings → Tournaments.
  </p>

  <h2 class="section-title">Points leaders</h2>
  <div class="list">
    <table class="num">
      <thead><tr><th class="l">Player</th><th>G</th><th>A</th><th>Pts</th></tr></thead>
      <tbody>
        {#each top as l, i (l.player.id)}
          <tr class:top={i === 0}>
            <td class="l"><span class="pos">{i + 1}</span>{l.player.name}</td>
            <td>{l.goals}</td><td>{l.assists}</td><td class="pts">{l.points}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    padding: var(--s-3) var(--s-3);
    text-align: right;
    white-space: nowrap;
  }
  td {
    border-top: 1px solid var(--border);
    color: var(--fg-body);
  }
  thead th {
    padding-top: var(--s-3);
    padding-bottom: var(--s-2);
    font-size: var(--text-2xs);
    font-weight: 600;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--fg-muted);
  }
  .l {
    text-align: left;
    padding-left: var(--s-4);
    color: var(--fg);
    font-weight: 500;
  }
  .pos {
    display: inline-block;
    width: 1.5rem;
    color: var(--fg-subtle);
    font-weight: 400;
  }
  .top .pos {
    color: var(--red-hot);
    font-weight: 700;
  }
  .pts {
    padding-right: var(--s-4);
    color: var(--fg);
    font-weight: 700;
  }
</style>
