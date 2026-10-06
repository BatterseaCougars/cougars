<script lang="ts">
  import BackLink from "../lib/BackLink.svelte";
  import Person from "../lib/Person.svelte";
  import { db } from "../demo/store.svelte";
  import { owedBy } from "../demo/dues.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import { pounds } from "../lib/dates";

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
      {@const owes = owedBy(m.player.id)}
      <a class="row" href="/settings/members/{m.player.id}">
        <Person player={m.player} showRating meta="{m.roles[0]} · {m.plan}" />
        {#if owes > 0}<span class="badge red num">Owes {pounds(owes)}</span>{/if}
        <Icon name="chevronRight" size={18} />
      </a>
    {/each}
  </div>
</div>
