<script lang="ts">
  // The top of every tournament page: the type as the eyebrow, the page, its status, and which edition it's showing.
  import type { Tournament, TournamentType } from "../demo/model";
  import PageHeader from "./PageHeader.svelte";
  import { whenOf } from "../demo/schedule.svelte";

  let { type, tournament, title }: { type: TournamentType; tournament?: Tournament; title: string } = $props();

  const STATUS = { planned: "Coming up", open: "Sign-up open", live: "Live", finished: "Finished" } as const;
  const subtitle = $derived(
    tournament
      ? [tournament.name, whenOf(tournament), tournament.location].filter(Boolean).join(" · ")
      : `No ${type.shortName} scheduled yet. An admin can add one under Settings → Tournaments.`,
  );
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
  </PageHeader>
</div>

<style>
  .tone {
    display: contents;
  }
</style>
