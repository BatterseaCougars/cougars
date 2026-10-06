<script lang="ts">
  // Teammates: the club's active players. Everyone sees trading cards, Cougars first; tap one to turn it over.
  // Someone who manages members also gets the join requests to approve, a Rows view (a sortable grid with what an
  // admin needs at a glance), and a tap on a card or row opens everything about them (MemberSheet).
  // A link to /more/teammates/:id (Overdue Rentals, a training's card) opens here with that card up.
  import PageHeader from "../lib/PageHeader.svelte";
  import { can } from "../access/actions";
  import { emailFor, phoneFor, type Player } from "../demo/data";
  import { owedBy } from "../demo/dues.svelte";
  import { granted, me } from "../demo/session.svelte";
  import { db } from "../demo/store.svelte";
  import { navigate } from "../app/router.svelte";
  import { saveMember } from "../app/backend.svelte";
  import Person from "../lib/Person.svelte";
  import PlayerCard from "../lib/PlayerCard.svelte";
  import PlayerCardZoom from "../lib/PlayerCardZoom.svelte";
  import MemberSheet from "../lib/MemberSheet.svelte";
  import SearchField from "../lib/SearchField.svelte";
  import { pounds } from "../lib/dates";
  import DataGrid from "../lib/DataGrid.svelte";
  import type { ColDef } from "ag-grid-community";

  let { memberId }: { memberId?: number } = $props();

  const perms = $derived(granted());
  const ratings = $derived(can(perms, "read:Rating"));
  const admin = $derived(can(perms, "manage:Member"));
  const who = $derived(me());
  let filter = $state<"all" | "F" | "D" | "G">("all");
  let query = $state("");

  const pending = $derived(db.members.filter((m) => m.status === "pending"));
  const active = $derived(db.members.filter((m) => m.status === "active"));
  const shown = $derived(
    active
      .filter((m) => filter === "all" || m.player.position === filter)
      .filter((m) => !query.trim() || m.player.name.toLowerCase().includes(query.trim().toLowerCase())),
  );
  const byCard = $derived(
    [...shown].sort(
      (a, b) => Number(b.player.cougar) - Number(a.player.cougar) || a.player.name.localeCompare(b.player.name),
    ),
  );

  // Cards or rows: rows are for admins. Remembered per device.
  const VIEW_KEY = "team.teammates.view";
  let view = $state<"cards" | "rows">(readView());
  function readView(): "cards" | "rows" {
    try {
      return localStorage.getItem(VIEW_KEY) === "rows" ? "rows" : "cards";
    } catch {
      return "cards";
    }
  }
  function setView(v: "cards" | "rows") {
    view = v;
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // Private mode: it just isn't remembered
    }
  }
  const rows = $derived(admin && view === "rows");

  // The rows view: AG Grid, one column per thing an admin checks. Search and the position chips filter the rows.
  type Row = (typeof active)[number];
  const columns = $derived<ColDef<Row>[]>([
    { headerName: "Name", valueGetter: (p) => p.data?.player.name, pinned: "left", minWidth: 170, cellClass: "name" },
    { headerName: "Pos", valueGetter: (p) => p.data?.player.position, width: 76 },
    ...(ratings
      ? [
          {
            headerName: "Rating",
            valueGetter: (p) => p.data?.player.rating,
            width: 96,
            type: "numericColumn",
          } as ColDef<Row>,
        ]
      : []),
    { headerName: "Cougar", valueGetter: (p) => (p.data?.player.cougar ? "Cougar" : ""), width: 100 },
    { headerName: "Role", valueGetter: (p) => p.data?.roles[0] ?? "Member", width: 120 },
    {
      headerName: "Plan",
      valueGetter: (p) => (p.data?.plan === "Subscription" ? "Quarterly" : "Pay as you go"),
      width: 130,
    },
    { headerName: "Played", valueGetter: (p) => p.data?.player.played ?? 0, width: 96, type: "numericColumn" },
    {
      headerName: "Owes",
      valueGetter: (p) => (p.data ? owedBy(p.data.player.id) : 0),
      valueFormatter: (p) => (p.value > 0 ? pounds(p.value) : ""),
      cellClass: (p) => (p.value > 0 ? "owes" : ""),
      width: 96,
      type: "numericColumn",
    },
    {
      headerName: "Email",
      valueGetter: (p) => (p.data && emailFor(p.data.player) !== "No email yet" ? emailFor(p.data.player) : ""),
      minWidth: 180,
      flex: 1,
    },
    { headerName: "Phone", valueGetter: (p) => (p.data ? (phoneFor(p.data.player.id) ?? "") : ""), width: 140 },
  ]);

  // The card that's been picked up, and where it lies (none: it grows in place). Admins get the member sheet.
  let lifted = $state<{ player: Player; el?: HTMLElement } | null>(null);
  const open = (p: Player, el?: HTMLElement) => (lifted = { player: p, el });
  // Arrived by a link to a member: their card is already up
  $effect(() => {
    const m = memberId != null ? db.members.find((x) => x.player.id === memberId) : undefined;
    if (m && admin) lifted = { player: m.player };
  });
  function close() {
    lifted = null;
    if (memberId != null) navigate("/more/teammates", { replace: true });
  }
  function approve(m: Row) {
    m.status = "active";
    m.roles = ["Member"];
    saveMember(m);
  }
</script>

<div class="page" class:wide={rows}>
  <PageHeader
    title="Teammates"
    subtitle="{active.length} players · {active.filter((m) => m.player.cougar).length} Cougars{admin && pending.length
      ? ` · ${pending.length} asking to join`
      : ''}"
    active={filter === "all" ? 0 : 1}
    onclear={() => (filter = "all")}
  >
    {#snippet toolbar()}
      <SearchField bind:value={query} placeholder="Search teammates" />
      {#if admin}
        <div class="seg sm view" role="group" aria-label="Show as">
          <button aria-pressed={view === "cards"} onclick={() => setView("cards")}>Cards</button>
          <button aria-pressed={view === "rows"} onclick={() => setView("rows")}>Rows</button>
        </div>
      {/if}
    {/snippet}
    {#snippet filters()}
      <div class="filters" role="group" aria-label="Position">
        {#each [["all", "All"], ["F", "Forwards"], ["D", "Defence"], ["G", "Keepers"]] as [v, label] (v)}
          <button class="filter" aria-pressed={filter === v} onclick={() => (filter = v as typeof filter)}
            >{label}</button
          >
        {/each}
      </div>
    {/snippet}
  </PageHeader>

  {#if admin && pending.length}
    <h2 class="section-title">Asking to join</h2>
    <div class="list rise">
      {#each pending as m (m.player.id)}
        <div class="row">
          <Person player={m.player} />
          <button class="btn primary sm" onclick={() => approve(m)}>Approve</button>
        </div>
      {/each}
    </div>
  {/if}

  {#if !shown.length}<p class="hint">No one matches.</p>{/if}

  {#if rows}
    <DataGrid rows={shown} {columns} rowId={(m) => String(m.player.id)} onrowclick={(m) => open(m.player)} />
  {:else}
    <div class="cards">
      {#each byCard as m (m.player.id)}
        <PlayerCard
          player={m.player}
          you={m.player.id === who.id}
          showRating={ratings}
          lifted={lifted?.player.id === m.player.id}
          onopen={(el) => open(m.player, el)}
        />
      {/each}
    </div>
  {/if}
</div>

{#if lifted && admin}
  {#key lifted.player.id}
    <MemberSheet memberId={lifted.player.id} source={lifted.el} onclose={close} />
  {/key}
{:else if lifted}
  <PlayerCardZoom
    player={lifted.player}
    source={lifted.el}
    you={lifted.player.id === who.id}
    showRating={ratings}
    bio={lifted.player.bio}
    onclose={close}
  />
{/if}

<style>
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6.4rem, 1fr));
    gap: var(--s-3);
  }
  @media (min-width: 901px) {
    .cards {
      grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
      gap: var(--s-4);
    }
    /* Desktop: the view toggle takes the row's right end, where a page's actions go; phones keep it by the search */
    .view {
      order: 1;
      margin-left: auto;
    }
  }
  /* Grid cells: the name stands out; what's owed shows in red */
  :global(.data-grid .name) {
    color: var(--fg);
    font-weight: 600;
  }
  :global(.data-grid .owes) {
    color: var(--red-hot);
    font-weight: 600;
  }
</style>
