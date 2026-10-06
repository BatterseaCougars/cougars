<script lang="ts">
  import BackLink from "../lib/BackLink.svelte";
  import { ledgerFor, referenceFor } from "../demo/data";
  import { me } from "../demo/session.svelte";
  import { pounds } from "../lib/dates";

  const who = me();
  const ledger = ledgerFor(who.id);
  const owed = ledger.reduce((sum, l) => sum + l.pence, 0);
</script>

<div class="page">
  <BackLink />
  <header class="total">
    <p class="eyebrow">{owed > 0 ? "You owe" : "All square"}</p>
    <p class="display amount num" class:zero={owed <= 0}>{pounds(owed)}</p>
    <p class="hint">Pay as you go · per-session fee</p>
  </header>

  <div class="panel feature pad pay">
    <h2>Pay by bank transfer</h2>
    <dl class="num">
      <dt>Name</dt>
      <dd>Battersea Cougars</dd>
      <dt>Sort code</dt>
      <dd>00-00-00</dd>
      <dt>Account</dt>
      <dd>00000000</dd>
      <dt>Reference</dt>
      <dd class="ref">{referenceFor(who.id)}</dd>
    </dl>
    <p class="hint">Always use your reference, so your payment is matched to you. Sample bank details.</p>
  </div>

  <h2 class="section-title">History</h2>
  <div class="list">
    {#each [...ledger].reverse() as l (l.date + l.what)}
      <div class="row">
        <span class="grow"><span class="title">{l.what}</span><span class="sub">{l.date}</span></span>
        <span class="num amt" class:paid={l.pence < 0}>{l.pence < 0 ? "−" : ""}{pounds(Math.abs(l.pence))}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .total {
    display: grid;
    gap: var(--s-2);
    padding: var(--s-2) var(--s-1) 0;
  }
  .amount {
    font-size: clamp(3.5rem, 18vw, 5rem);
    color: var(--red-hot);
  }
  .amount.zero {
    color: var(--green);
  }
  .pay h2 {
    font-size: var(--text-md);
    font-weight: 600;
  }
  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--s-2) var(--s-5);
    margin: var(--s-4) 0;
  }
  dt {
    color: var(--fg-muted);
  }
  dd {
    margin: 0;
    color: var(--fg);
  }
  .ref {
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .amt {
    color: var(--fg);
    font-weight: 500;
  }
  .paid {
    color: var(--green);
  }
</style>
