<script lang="ts">
  // The table from the tournament's group games with a result (ADR 0061): points, then goal difference, then goals
  // for, with its own points for a win, draw and loss. Empty until the fixtures are made. Scorers come with live
  // scoring (T5).
  import { PLAYERS } from "../demo/data";
  import { currentTournament, typeById } from "../demo/schedule.svelte";
  import { table } from "../lib/fixtures";
  import TournamentHead from "../lib/TournamentHead.svelte";

  let { typeId }: { typeId: number } = $props();

  const type = $derived(typeById(typeId)!);
  const tournament = $derived(currentTournament(typeId));
  // This tournament's own points (ADR 0049), else the series'
  const rules = $derived(tournament ?? type);
  const points = $derived({ win: rules.pointsWin, draw: rules.pointsDraw, loss: rules.pointsLoss });
  const teams = $derived(tournament?.teams ?? []);
  const group = $derived((tournament?.games ?? []).filter((g) => g.stage === "group"));
  const rows = $derived(
    table(
      teams.flatMap((t) => (t.id ? [t.id] : [])),
      group,
      points,
    ),
  );
  const firstName = (id: number | null) => PLAYERS.find((p) => p.id === id)?.name.split(" ")[0] ?? "";
  const teamName = (id: number) => {
    const t = teams.find((x) => x.id === id);
    return t ? t.name || `Team ${firstName(t.captainMemberId)}` : "";
  };
</script>

<div class="page">
  <TournamentHead {type} {tournament} title="Standings" />

  {#if !group.length}
    <p class="note">The table starts once the fixtures are made and the first result is in.</p>
  {:else}
    <div class="list">
      <table class="num">
        <thead><tr><th class="l">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
        <tbody>
          {#each rows as r, i (r.teamId)}
            <tr class:top={i === 0 && r.p > 0}>
              <td class="l"><span class="pos">{i + 1}</span>{teamName(r.teamId)}</td>
              <td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td>
              <td>{r.gf - r.ga > 0 ? "+" : ""}{r.gf - r.ga}</td>
              <td class="pts">{r.pts}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
  <p class="hint">
    Points, then goal difference, then goals for. Win {rules.pointsWin}, draw {rules.pointsDraw}, loss
    {rules.pointsLoss}: set under Settings → Tournaments.
  </p>
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
