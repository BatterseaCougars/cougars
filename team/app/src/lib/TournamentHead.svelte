<script lang="ts">
  // The top of every tournament page: the type, the page, and which edition it's showing.
  import Icon from "../app/shell/Icon.svelte";
  import type { Tournament, TournamentType } from "../demo/model";
  import { formatDayDate, londonISO } from "./dates";

  let { type, tournament, title }: { type: TournamentType; tournament?: Tournament; title: string } = $props();

  const STATUS = { planned: "Coming up", open: "Sign-up open", live: "Live", finished: "Finished" } as const;
</script>

<header class="head" style:--tone="var(--tone-{type.tone})">
  <p class="kicker"><Icon name={type.icon} size={14} /> {type.name}</p>
  <div class="row-head">
    <h1 class="display">{title}</h1>
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
  </div>
  {#if tournament}
    <p class="hint">
      {tournament.name} · {formatDayDate(londonISO(tournament.heldOn, tournament.startTime))} · {tournament.startTime}–{tournament.endTime}
      · {tournament.location}
    </p>
  {:else}
    <p class="hint">No {type.shortName} scheduled yet. An admin can add one under Settings → Tournaments.</p>
  {/if}
</header>

<style>
  .head {
    display: grid;
    gap: var(--s-2);
  }
  .kicker {
    color: var(--tone);
  }
  .kicker::before {
    display: none;
  }
  .row-head {
    display: flex;
    align-items: center;
    gap: var(--s-3);
  }
  h1 {
    font-size: clamp(2rem, 8vw, 2.75rem);
  }
</style>
