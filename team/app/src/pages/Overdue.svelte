<script lang="ts">
  // Overdue Rentals, the aged-receivables report (ADR 0032): every unpaid charge, added up per member and by how
  // long it's been owed. Marking a charge paid on a member's profile takes it off here.
  import Icon from "../app/shell/Icon.svelte";
  import { PLAYERS, referenceFor } from "../demo/data";
  import { db } from "../demo/store.svelte";
  import { BUCKETS, BUCKET_HINT, aged } from "../lib/dues";
  import { londonToday, pounds } from "../lib/dates";

  const rows = $derived(
    aged(db.charges, londonToday()).map((r) => ({
      ...r,
      player: PLAYERS.find((p) => p.id === r.memberId)!,
      reference: referenceFor(r.memberId),
    })),
  );
  const totals = $derived(BUCKETS.map((_, i) => rows.reduce((s, r) => s + r.amounts[i], 0)));
  const grand = $derived(totals.reduce((a, b) => a + b, 0));
  const max = $derived(Math.max(1, ...totals));
  const tone = ["", "amber", "red", "red"];
</script>

<div class="page">
  <header class="head">
    <p class="kicker">Aged receivables</p>
    <h1 class="display">Overdue Rentals</h1>
    <p class="hint">Who owes what, and how long it's been out. Be kind, rewind.</p>
  </header>

  <div class="total">
    <span class="eyebrow">Total out</span>
    <span class="display num amount">{pounds(grand)}</span>
  </div>

  <div class="buckets">
    {#each BUCKETS as b, i (b)}
      <div class="bucket">
        <span
          class="bar"
          style:height="{Math.max(6, (totals[i] / max) * 100)}%"
          class:amber={tone[i] === "amber"}
          class:red={tone[i] === "red"}
        ></span>
        <span class="display num value">{pounds(totals[i])}</span>
        <span class="eyebrow">{b}</span>
        <span class="hint">{BUCKET_HINT[i]}</span>
      </div>
    {/each}
  </div>

  <div class="list">
    {#each rows as r (r.memberId)}
      <a class="row" href="/more/teammates/{r.memberId}">
        <span class="grow"><span class="title">{r.player.name}</span><span class="sub num">{r.reference}</span></span>
        <span class="badge {tone[r.oldest]}">{BUCKETS[r.oldest]}</span>
        <span class="num amt">{pounds(r.total)}</span>
        <Icon name="chevronRight" size={18} />
      </a>
    {:else}
      <p class="row hint">Nobody owes anything. Be kind, rewind.</p>
    {/each}
  </div>

  <div class="actions">
    <button class="btn outline">Export CSV</button>
    <button class="btn outline">Send reminders</button>
  </div>
</div>

<style>
  .head {
    display: grid;
    gap: var(--s-3);
  }
  .head h1 {
    font-size: clamp(2.2rem, 9vw, 3rem);
    color: var(--red-hot);
  }
  .total {
    display: grid;
    gap: var(--s-1);
    padding: 0 var(--s-1);
  }
  .amount {
    font-size: 3rem;
    color: var(--fg);
  }
  .buckets {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-block: 1px solid var(--border);
  }
  .bucket {
    display: grid;
    grid-template-rows: 3.5rem auto auto auto;
    align-items: end;
    gap: var(--s-1);
    padding: var(--s-4) var(--s-3);
  }
  .bucket + .bucket {
    border-left: 1px solid var(--border);
  }
  .bar {
    display: block;
    width: 100%;
    max-width: 2.5rem;
    border-radius: 3px 3px 0 0;
    background: var(--fg-subtle);
    transition: height var(--t-slow) var(--ease);
  }
  .bar.amber {
    background: var(--amber);
  }
  .bar.red {
    background: var(--red);
  }
  .value {
    font-size: 1.3rem;
    color: var(--fg);
  }
  .amt {
    min-width: 3rem;
    text-align: right;
    color: var(--fg);
    font-weight: 600;
  }
  .actions {
    display: flex;
    gap: var(--s-2);
  }
  @media (max-width: 420px) {
    .bucket {
      padding-inline: var(--s-2);
    }
    .bucket .hint {
      display: none;
    }
  }
</style>
