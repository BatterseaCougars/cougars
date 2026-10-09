<script lang="ts">
  // One charge: what it was for, when, how much, and whether it's paid. Admins (on a member's profile) can mark it
  // paid by transfer or cash, or take that back; members just see it.
  import Icon from "../app/shell/Icon.svelte";
  import { labelFor } from "../demo/dues.svelte";
  import { markPaid, markUnpaid } from "../demo/store.svelte";
  import type { Charge } from "./dues";
  import { formatDayDate, pounds } from "./dates";

  let { charge, editable = false }: { charge: Charge; editable?: boolean } = $props();
  const label = $derived(labelFor(charge));
  const paidOn = $derived(charge.paidOn ? formatDayDate(`${charge.paidOn}T12:00:00Z`) : "");
</script>

<div class="row charge" class:paid={!!charge.paidOn} style:--tone="var(--tone-{label.tone})">
  <span class="chip"><Icon name={label.icon} size={16} /></span>
  <span class="grow">
    <span class="title">{label.title}</span>
    <span class="sub">
      {formatDayDate(label.at)}
      {#if charge.paidOn}· paid {paidOn}{charge.paidVia === "cash" ? " in cash" : " by transfer"}{/if}
    </span>
  </span>
  <span class="num amt">{pounds(charge.pence)}</span>
  {#if editable}
    <!-- Fixed width either way, so marking one paid doesn't shift the row -->
    <span class="act">
      {#if charge.paidOn}
        <button class="btn sm ghost" onclick={() => markUnpaid(charge.id)} aria-label="Mark {label.title} unpaid">
          <Icon name="check" size={14} /> Paid
        </button>
      {:else}
        <span class="seg sm pay" role="group" aria-label="Mark {label.title} paid">
          <button onclick={() => markPaid(charge.id, "transfer")}>Transfer</button>
          <button onclick={() => markPaid(charge.id, "cash")}>Cash</button>
        </span>
      {/if}
    </span>
  {:else if charge.paidOn}
    <span class="badge green">Paid</span>
  {:else}
    <span class="badge red">Owed</span>
  {/if}
</div>

<style>
  .chip {
    display: grid;
    place-items: center;
    flex: none;
    width: 2rem;
    height: 2rem;
    border-radius: var(--r-sm);
    background: color-mix(in srgb, var(--tone) 16%, transparent);
    color: var(--tone);
  }
  .amt {
    color: var(--fg);
    font-weight: 600;
  }
  .paid .amt {
    color: var(--fg-muted);
    font-weight: 500;
  }
  .act {
    display: flex;
    justify-content: flex-end;
    width: 9.5rem;
  }
  .act .btn {
    color: var(--green);
  }
  .pay button:hover {
    color: var(--fg);
    background: color-mix(in srgb, var(--fg) 8%, transparent);
  }
  @media (max-width: 480px) {
    .act {
      width: 8.25rem;
    }
    .pay button {
      padding: 0 var(--s-2);
    }
  }
</style>
