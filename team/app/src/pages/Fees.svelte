<script lang="ts">
  import BackLink from "../lib/BackLink.svelte";
  import { db } from "../demo/store.svelte";
  import { pounds } from "../lib/dates";

  let kind = $state("Per session");
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
  <BackLink />
  <div class="page-head">
    <div>
      <h1>Fees</h1>
      <p class="hint">A new fee applies from its date. Charges already made keep the amount they had.</p>
    </div>
  </div>

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
    <h2>New fee</h2>
    <select class="input" bind:value={kind}>
      <option>Per session</option>
      <option>Quarterly subscription</option>
    </select>
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
