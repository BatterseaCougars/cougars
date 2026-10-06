<script lang="ts">
  import BackLink from "../lib/BackLink.svelte";
  import Person from "../lib/Person.svelte";
  import { db } from "../demo/store.svelte";

  const pending = $derived(db.members.filter((m) => m.status === "pending"));
  const active = $derived(db.members.filter((m) => m.status === "active"));
</script>

<div class="page">
  <BackLink />
  <div class="page-head">
    <div>
      <h1>Members</h1>
      <p class="hint num">{active.length} active{pending.length ? ` · ${pending.length} asking to join` : ""}</p>
    </div>
  </div>

  {#if pending.length}
    <h2 class="section-title">Asking to join</h2>
    <div class="list rise">
      {#each pending as m (m.player.id)}
        <div class="row">
          <Person player={m.player} />
          <button class="btn primary sm" onclick={() => ((m.status = "active"), (m.roles = ["Member"]))}>Approve</button
          >
        </div>
      {/each}
    </div>
  {/if}

  <h2 class="section-title">Members</h2>
  <div class="list">
    {#each active as m (m.player.id)}
      <div class="row">
        <Person player={m.player} showRating meta={m.plan} />
        <select class="input role" bind:value={m.roles[0]} aria-label="Role for {m.player.name}">
          {#each db.roles as r (r.id)}<option>{r.name}</option>{/each}
        </select>
      </div>
    {/each}
  </div>
</div>

<style>
  .role {
    width: auto;
    height: var(--control-h-sm);
    padding: 0 var(--s-3);
    font-size: var(--text-sm);
  }
</style>
