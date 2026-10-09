<script lang="ts">
  // Settings → Members: everyone in the club as one table, for whoever manages members. Sortable, resizable columns,
  // search and the position chips filter it; a tap on a row opens everything about them (MemberSheet). The page fills
  // the room beside the settings list and the window's height, and the table scrolls inside itself, so its header row
  // stays in view. Teammates is the everyday view (cards), for everyone.
  import PageHeader from "../lib/PageHeader.svelte";
  import { can } from "../access/actions";
  import { emailFor, phoneFor, type MemberRow } from "../demo/data";
  import { owedBy } from "../demo/dues.svelte";
  import { granted } from "../demo/session.svelte";
  import { db } from "../demo/store.svelte";
  import MemberSheet from "../lib/MemberSheet.svelte";
  import AddMemberSheet from "../lib/AddMemberSheet.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import SearchField from "../lib/SearchField.svelte";
  import { pounds } from "../lib/dates";
  import DataGrid from "../lib/DataGrid.svelte";
  import { goesBy } from "../lib/names";
  import type { ColDef } from "ag-grid-community";

  const ratings = $derived(can(granted(), "read:Rating"));
  // Adding someone to the club (ADR 0069)
  let adding = $state(false);
  let filter = $state<"all" | "F" | "D" | "G">("all");
  let query = $state("");
  let open = $state<number | null>(null);

  const active = $derived(db.members.filter((m) => m.status === "active"));
  const shown = $derived(active.filter((m) => filter === "all" || m.player.position === filter));

  // One column per thing an admin checks, each as wide as what's in it (DataGrid)
  const columns = $derived<ColDef<MemberRow>[]>([
    { headerName: "Name", valueGetter: (p) => p.data?.player.name, pinned: "left", cellClass: "name" },
    // What the app calls them (ADR 0043), when it isn't their full name
    {
      headerName: "Goes by",
      valueGetter: (p) => (p.data && goesBy(p.data.player) !== p.data.player.name ? goesBy(p.data.player) : ""),
    },
    { headerName: "Pos", valueGetter: (p) => p.data?.player.position },
    ...(ratings
      ? [
          {
            headerName: "Rating",
            valueGetter: (p) => p.data?.player.rating,
            type: "numericColumn",
          } as ColDef<MemberRow>,
        ]
      : []),
    { headerName: "Cougar", valueGetter: (p) => (p.data?.player.cougar ? "Cougar" : "") },
    { headerName: "Role", valueGetter: (p) => p.data?.roles[0] ?? "Member" },
    {
      headerName: "Plan",
      valueGetter: (p) => (p.data?.plan === "Subscription" ? "Quarterly" : "Pay as you go"),
    },
    { headerName: "Played", valueGetter: (p) => p.data?.player.played ?? 0, type: "numericColumn" },
    {
      headerName: "Owes",
      valueGetter: (p) => (p.data ? owedBy(p.data.player.id) : 0),
      valueFormatter: (p) => (p.value > 0 ? pounds(p.value) : ""),
      cellClass: (p) => (p.value > 0 ? "owes" : ""),
      type: "numericColumn",
    },
    {
      headerName: "Email",
      valueGetter: (p) => (p.data && emailFor(p.data.player) !== "No email yet" ? emailFor(p.data.player) : ""),
    },
    { headerName: "Phone", valueGetter: (p) => (p.data ? (phoneFor(p.data.player.id) ?? "") : "") },
  ]);
</script>

<div class="page full fill">
  <PageHeader
    title="Members"
    subtitle="{active.length} players · {active.filter((m) => m.player.cougar).length} Cougars"
    active={filter === "all" ? 0 : 1}
    onclear={() => (filter = "all")}
  >
    {#snippet actions()}
      <button class="btn sm primary" aria-haspopup="dialog" onclick={() => (adding = true)}
        ><Icon name="userPlus" size={16} />Member</button
      >
    {/snippet}
    {#snippet toolbar()}
      <SearchField bind:value={query} placeholder="Search members" />
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

  <div class="table">
    <DataGrid
      rows={shown}
      {columns}
      filter={query}
      rowId={(m) => String(m.player.id)}
      onrowclick={(m) => (open = m.player.id)}
    />
  </div>
</div>

<AddMemberSheet bind:open={adding} />

{#if open != null}
  {#key open}
    <MemberSheet memberId={open} onclose={() => (open = null)} />
  {/key}
{/if}

<style>
  /* The rest of the window's height, never less than a few rows on a short phone (then the page scrolls too) */
  .table {
    flex: 1;
    min-height: 18rem;
  }
  /* Grid cells: the name stands out; what's owed shows in red */
  .table :global(.name) {
    color: var(--fg);
    font-weight: 500;
  }
  .table :global(.owes) {
    color: var(--red-hot);
    font-weight: 500;
  }
</style>
