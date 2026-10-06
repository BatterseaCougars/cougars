<script lang="ts">
  // Your dues (ADR 0032): every session and tournament you were charged for, and whether it's paid.
  import ChargeRow from "../lib/ChargeRow.svelte";
  import { referenceFor } from "../demo/data";
  import { chargesFor, owedBy } from "../demo/dues.svelte";
  import { me } from "../demo/session.svelte";
  import { pounds } from "../lib/dates";

  const who = $derived(me());
  const charges = $derived(chargesFor(who.id));
  const unpaid = $derived(charges.filter((c) => !c.paidOn));
  const paid = $derived(charges.filter((c) => c.paidOn));
  const owed = $derived(owedBy(who.id));
</script>

<div class="page">
  <header class="total">
    <p class="eyebrow">{owed > 0 ? "You owe" : "All square"}</p>
    <p class="display amount num" class:zero={owed <= 0}>{pounds(owed)}</p>
    <p class="hint">
      {unpaid.length ? `${unpaid.length} ${unpaid.length === 1 ? "session" : "sessions"} not paid yet` : "Nothing owed"}
    </p>
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

  {#if unpaid.length}
    <h2 class="section-title">Not paid yet</h2>
    <div class="list">
      {#each unpaid as c (c.id)}<ChargeRow charge={c} />{/each}
    </div>
  {/if}

  <h2 class="section-title">Payment history</h2>
  <div class="list">
    {#each paid as c (c.id)}<ChargeRow charge={c} />{:else}<p class="row hint">No payments yet.</p>{/each}
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
</style>
