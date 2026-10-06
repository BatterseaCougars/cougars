<script lang="ts">
  import PageHeader from "../lib/PageHeader.svelte";
  import { can } from "../access/actions";
  import { PLAYERS } from "../demo/data";
  import { granted } from "../demo/session.svelte";
  import Person from "../lib/Person.svelte";
  import SearchField from "../lib/SearchField.svelte";

  const perms = $derived(granted());
  let filter = $state<"all" | "F" | "D" | "G">("all");
  let query = $state("");
  const shown = $derived(
    PLAYERS.filter((p) => filter === "all" || p.position === filter).filter(
      (p) => !query.trim() || p.name.toLowerCase().includes(query.trim().toLowerCase()),
    ),
  );
</script>

<div class="page">
  <PageHeader
    title="Teammates"
    subtitle="{PLAYERS.length} players · {PLAYERS.filter((p) => p.cougar).length} Cougars"
    active={filter === "all" ? 0 : 1}
    onclear={() => (filter = "all")}
  >
    {#snippet toolbar()}<SearchField bind:value={query} placeholder="Search teammates" />{/snippet}
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
  {#if !shown.length}<p class="hint">No one matches.</p>{/if}
  <div class="list">
    {#each shown as p (p.id)}
      <div class="row">
        <Person player={p} showRating={can(perms, "read:Rating")} />
        {#if p.cougar}<span class="badge red">Cougar</span>{/if}
      </div>
    {/each}
  </div>
</div>

<style>
</style>
