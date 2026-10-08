<script lang="ts">
  // Settings → Tournaments: the schedule, a card for each tournament, what an admin comes here to change: when and
  // where it is, sign-up, the draft and its captains. A card opens that tournament's editor in a modal panel; "New
  // tournament" opens a blank one, which can start from a series' defaults (Settings → Tournament Series).
  import PageHeader from "../lib/PageHeader.svelte";
  import ScheduleCards, { type ScheduleCard } from "../lib/ScheduleCards.svelte";
  import { STATUSES } from "../lib/TournamentDateEditor.svelte";
  import TournamentEditorPanel, { editTournament } from "../lib/TournamentEditorPanel.svelte";
  import { tournamentPlace, typeById, whenOf } from "../demo/schedule.svelte";
  import { db } from "../demo/store.svelte";
  import { londonToday, pounds } from "../lib/dates";

  // Dates still to come first, soonest first; then the finished ones, latest first
  const dates = $derived(
    [...db.tournaments].sort((a, b) => {
      const doneA = a.status === "finished" || a.heldOn < londonToday();
      const doneB = b.status === "finished" || b.heldOn < londonToday();
      if (doneA !== doneB) return doneA ? 1 : -1;
      return doneA ? b.heldOn.localeCompare(a.heldOn) : a.heldOn.localeCompare(b.heldOn);
    }),
  );

  const dateCards = $derived(
    dates.flatMap((t): ScheduleCard[] => {
      const type = typeById(t.typeId);
      return [
        {
          id: t.id,
          icon: type?.icon ?? "trophy",
          tone: type?.tone ?? "red",
          status: {
            label: STATUSES.find((s) => s.id === t.status)?.label ?? t.status,
            tone: t.status === "open" || t.status === "live" ? "green" : undefined,
          },
          eyebrow: type?.name ?? "On its own",
          name: t.name,
          next: whenOf(t),
          nextLabel: "When",
          lines: [
            tournamentPlace(t)?.name ?? "No location yet",
            // A draft: members say they're in, then captains pick; otherwise teams enter
            t.kind === "draft"
              ? `${pounds(t.feePence) || "Free"} · ${t.going.length}${t.capacity ? ` / ${t.capacity}` : ""} in`
              : `${pounds(t.feePence) || "Free"} a player`,
            t.kind === "draft"
              ? t.teams.length
                ? `${t.teams.length} captains`
                : "No captains yet"
              : `${t.teams.length} ${t.teams.length === 1 ? "team" : "teams"}`,
          ],
        },
      ];
    }),
  );
</script>

<div class="page">
  <PageHeader title="Tournaments" subtitle="The schedule. Open one to set its day, sign-up, draft and captains." />
  <ScheduleCards
    cards={dateCards}
    add={{ name: "New tournament", hint: "On its own, or in a series to start from its defaults." }}
    onopen={(id) => editTournament(id)}
  />
</div>

<TournamentEditorPanel />
