<script lang="ts">
  // Settings → Tournaments: every tournament type as a card, as Settings → Training shows its trainings (ADR 0030).
  // A card opens that type's editor in a modal panel, with its dates; "New tournament type" opens a blank one.
  import PageHeader from "../lib/PageHeader.svelte";
  import ScheduleCards, { type ScheduleCard } from "../lib/ScheduleCards.svelte";
  import EditorPanel from "../lib/EditorPanel.svelte";
  import TournamentEditor from "../lib/TournamentEditor.svelte";
  import { whenOf } from "../demo/schedule.svelte";
  import { db } from "../demo/store.svelte";
  import { londonToday, pounds } from "../lib/dates";

  const cards = $derived(
    db.tournamentTypes.map((t): ScheduleCard => {
      const mine = db.tournaments.filter((x) => x.typeId === t.id);
      const next = mine.filter((x) => x.heldOn >= londonToday()).sort((a, b) => a.heldOn.localeCompare(b.heldOn))[0];
      return {
        id: t.id,
        icon: t.icon,
        tone: t.tone,
        status: t.active ? { label: "Running", tone: "green" } : { label: "Paused" },
        eyebrow: `Round robin${t.draft ? " · Captains draft" : ""}`,
        name: t.name,
        next: next ? `${next.name}, ${whenOf(next)}` : "Nothing scheduled",
        lines: [
          `Win ${t.pointsWin} · Draw ${t.pointsDraw} · Loss ${t.pointsLoss} · ${t.gameMinutes}-minute games`,
          `${pounds(t.defaultFeePence) || "Free"} to enter`,
          `${mine.length} ${mine.length === 1 ? "date" : "dates"}`,
        ],
      };
    }),
  );

  // The type open in the panel, or a new one
  let open = $state<number | "new" | null>(null);
  const editing = $derived(typeof open === "number" ? db.tournamentTypes.find((t) => t.id === open) : undefined);
</script>

<div class="page">
  <PageHeader
    title="Tournaments"
    subtitle="The tournaments the club hosts. Each type gets its own section in the menu."
  />
  <ScheduleCards
    {cards}
    add={{ name: "New tournament type", hint: "A format and its rules. Then schedule its dates." }}
    onopen={(id) => (open = id)}
  />
</div>

{#if open !== null}
  {#key open}
    <EditorPanel
      eyebrow={editing ? `Tournament · Round robin${editing.draft ? " · Captains draft" : ""}` : "Tournament"}
      title={editing?.name ?? "New tournament type"}
      icon={editing?.icon}
      tone={editing?.tone}
      onclose={() => (open = null)}
    >
      <TournamentEditor typeId={editing?.id} oncreated={(id) => (open = id)} />
      {#snippet footer()}
        <button class="btn primary" type="submit" form="tournament-form">
          {editing ? "Save" : "Add tournament type"}
        </button>
      {/snippet}
    </EditorPanel>
  {/key}
{/if}
