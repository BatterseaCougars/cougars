<script lang="ts">
  import { can } from "../access/actions";
  import { PLAYERS } from "../demo/data";
  import { granted } from "../demo/session.svelte";
  import Person from "../lib/Person.svelte";

  const perms = $derived(granted());
  let filter = $state<"all" | "F" | "D">("all");
  const shown = $derived(PLAYERS.filter((p) => filter === "all" || p.position === filter));
</script>

<div class="page">
  <div class="page-head">
    <div>
      <h1>Roster</h1>
      <p class="hint num">{PLAYERS.length} players · {PLAYERS.filter((p) => p.cougar).length} Cougars</p>
    </div>
  </div>
  <div class="seg" role="group" aria-label="Position">
    {#each [["all", "All"], ["F", "Forwards"], ["D", "Defence"]] as [v, label] (v)}
      <button aria-pressed={filter === v} onclick={() => (filter = v as typeof filter)}>{label}</button>
    {/each}
  </div>
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
  .seg {
    display: flex;
  }
</style>
