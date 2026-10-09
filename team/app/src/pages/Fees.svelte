<script lang="ts">
  import PageHeader from "../lib/PageHeader.svelte";
  import Sheet from "../lib/Sheet.svelte";
  import DateField from "../lib/DateField.svelte";
  import Fab from "../lib/Fab.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import { db } from "../demo/store.svelte";
  import { pounds } from "../lib/dates";
  import { phone } from "../lib/viewport.svelte";

  // The quarterly subscription. Session fees are set on each training, tournament fees on each tournament (ADR 0007).
  const kind = "Quarterly subscription";
  // A new fee is set in a sheet (a modal on desktop), as every quick form is: the page stays where it is
  let adding = $state(false);
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
    adding = false;
  }
  const current = $derived(db.fees.filter((f) => !f.superseded));
</script>

<div class="page">
  <PageHeader title="Quarterly rate">
    {#snippet sub()}
      A new fee applies from its date; charges already made keep theirs. Session fees are set on each
      <a href="/settings/training">training</a>, tournament fees on each
      <a href="/settings/tournaments">tournament</a>.
    {/snippet}
    {#snippet actions()}
      {#if !phone.current}
        <button class="btn sm primary" aria-haspopup="dialog" onclick={() => (adding = true)}>
          <Icon name="plus" size={16} />Fee
        </button>
      {/if}
    {/snippet}
  </PageHeader>

  <!-- Empty, the strip and the list would be bare hairlines -->
  {#if current.length}
    <div class="stats">
      {#each current as f (f.kind)}
        <div class="stat">
          <span class="eyebrow">{f.kind}</span>
          <span class="value num">{pounds(f.amountPence)}</span>
          <span class="hint">from {f.from}</span>
        </div>
      {/each}
    </div>
  {/if}

  <h2 class="section-title">History</h2>
  {#if db.fees.length}
    <div class="list">
      {#each db.fees as f, i (i)}
        <div class="row" class:old={f.superseded}>
          <span class="grow"><span class="title">{f.kind}</span><span class="sub">from {f.from}</span></span>
          <span class="num amt">{pounds(f.amountPence)}</span>
          {#if f.superseded}<span class="badge">Old</span>{/if}
        </div>
      {/each}
    </div>
  {:else}
    <p class="hint">No fee set yet.</p>
  {/if}

  {#if phone.current}
    <Fab label="Fee" aria-haspopup="dialog" onclick={() => (adding = true)} />
  {/if}
  <Sheet bind:open={adding} title="New subscription fee">
    <form class="form" onsubmit={add}>
      <div class="two">
        <label class="field">
          Amount (£)
          <input class="input num" inputmode="decimal" placeholder="e.g. 60" required bind:value={amount} />
        </label>
        <div class="field">From <DateField id="fee-from" aria-label="From" required bind:value={from} /></div>
      </div>
      <p class="hint">Quarterly Members are charged this each quarter from that date.</p>
      <button class="btn primary">Set fee</button>
    </form>
  </Sheet>
</div>

<style>
  .old .title,
  .old .amt {
    opacity: 0.55;
  }
  .amt {
    color: var(--fg);
    font-weight: 500;
  }
</style>
