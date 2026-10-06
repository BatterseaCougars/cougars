<script lang="ts">
  import PageHeader from "../lib/PageHeader.svelte";
  import { db } from "../demo/store.svelte";
  import { pounds } from "../lib/dates";

  // The quarterly subscription. Session fees are set on each training, tournament fees on each tournament (ADR 0032).
  const kind = "Quarterly subscription";
  let amount = $state("");
  let from = $state("");

  function add(e: SubmitEvent) {
    e.preventDefault();
    const pence = Math.round(Number(amount) * 100);
    if (!pence || !from) return;
    db.fees = [
      { kind, amountPence: pence, from },
      ...db.fees.map((f) => (f.kind === kind ? { ...f, superseded: true } : f)),
    ];
    amount = "";
  }
  const current = $derived(db.fees.filter((f) => !f.superseded));
</script>

<div class="page">
  <PageHeader title="Subscription">
    {#snippet sub()}
      A new fee applies from its date; charges already made keep theirs. Session fees are set on each
      <a href="/settings/training">training</a>, tournament fees on each
      <a href="/settings/tournaments">tournament</a>.
    {/snippet}
  </PageHeader>

  <div class="stats">
    {#each current as f (f.kind)}
      <div class="stat">
        <span class="eyebrow">{f.kind}</span>
        <span class="value num">{pounds(f.amountPence)}</span>
        <span class="hint">from {f.from}</span>
      </div>
    {/each}
  </div>

  <form class="panel pad form" onsubmit={add}>
    <h2>New subscription fee</h2>
    <div class="two">
      <input class="input" inputmode="decimal" placeholder="Amount (£)" bind:value={amount} />
      <input class="input" type="date" bind:value={from} />
    </div>
    <button class="btn primary">Set fee</button>
  </form>

  <h2 class="section-title">History</h2>
  <div class="list">
    {#each db.fees as f, i (i)}
      <div class="row" class:old={f.superseded}>
        <span class="grow"><span class="title">{f.kind}</span><span class="sub">from {f.from}</span></span>
        <span class="num amt">{pounds(f.amountPence)}</span>
        {#if f.superseded}<span class="badge">Old</span>{/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .form h2 {
    font-size: var(--text-md);
    font-weight: 600;
  }
  .old .title,
  .old .amt {
    opacity: 0.55;
  }
  .amt {
    color: var(--fg);
    font-weight: 500;
  }
</style>
