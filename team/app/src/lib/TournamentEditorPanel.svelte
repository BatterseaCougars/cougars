<script lang="ts" module>
  // Which tournament the editor panel has open, from wherever an admin is: Settings → Tournaments, or a series' own
  // pages (Games, Standings, Draft), where "New date", "Edit" and "Add the captains" open it in place.
  type Tab = "details" | "rules" | "signup" | "teams";
  export const tournamentPanel = $state<{ open: number | "new" | null; typeId?: number; tab: Tab }>({
    open: null,
    tab: "details",
  });
  /** Open a tournament's editor (on a tab), or a new one (in a series). */
  export function editTournament(
    open: number | "new",
    { typeId, tab = "details" }: { typeId?: number; tab?: Tab } = {},
  ) {
    Object.assign(tournamentPanel, { open, typeId, tab });
  }
</script>

<script lang="ts">
  import { saving } from "../app/backend.svelte";
  import EditorPanel from "./EditorPanel.svelte";
  import TournamentDateEditor from "./TournamentDateEditor.svelte";
  import { typeById, whenOf } from "../demo/schedule.svelte";
  import { db } from "../demo/store.svelte";

  const date = $derived(
    typeof tournamentPanel.open === "number" ? db.tournaments.find((t) => t.id === tournamentPanel.open) : undefined,
  );
  const type = $derived(typeById(date?.typeId ?? tournamentPanel.typeId ?? null));
</script>

{#if tournamentPanel.open !== null}
  {#key tournamentPanel.open}
    <EditorPanel
      eyebrow={date ? `${type?.name ?? "Tournament"} · ${whenOf(date)}` : (type?.name ?? "Tournament")}
      title={date?.name ?? (type ? `New ${type.shortName} date` : "New tournament")}
      icon={type?.icon}
      tone={type?.tone}
      onclose={() => (tournamentPanel.open = null)}
    >
      <TournamentDateEditor
        dateId={date?.id}
        typeId={tournamentPanel.typeId}
        startTab={tournamentPanel.tab}
        oncreated={(id) => (tournamentPanel.open = id)}
      />
      {#snippet footer()}
        <button class="btn primary" type="submit" form="date-form" disabled={saving.busy > 0}
          >{date ? "Save" : "Schedule it"}</button
        >
      {/snippet}
    </EditorPanel>
  {/key}
{/if}
