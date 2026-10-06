<script lang="ts">
  import { saveMember } from "../app/backend.svelte";
  // A member, for an admin (Settings → Members → a name): their role and plan, and every session and tournament
  // they were charged for. Tick what they've paid for, by transfer or cash (ADR 0032); Overdue Rentals and their
  // own Dues page follow straight away.
  import BackBar from "../app/shell/BackBar.svelte";
  import { POSITIONS, emailFor, referenceFor, type Position } from "../demo/data";
  import { chargesFor, owedBy } from "../demo/dues.svelte";
  import { db, markPaid } from "../demo/store.svelte";
  import ChargeRow from "../lib/ChargeRow.svelte";
  import { pounds } from "../lib/dates";
  import { initials } from "../lib/initials";
  import Select from "../lib/Select.svelte";

  let { memberId }: { memberId: number } = $props();

  const member = $derived(db.members.find((m) => m.player.id === memberId)!);

  // Each change is saved as it's made (app/backend.svelte.ts). A member has one role of their own, plus Member.
  function setRole(role: string) {
    member.roles = role === "Member" ? ["Member"] : [role, "Member"];
    saveMember(member);
  }
  function setPosition(position: Position) {
    if (member.player.position === position) return;
    member.player.position = position;
    saveMember(member);
  }
  function setRating(rating: number) {
    if (!Number.isInteger(rating) || rating < 0 || rating > 100) return;
    member.player.rating = rating;
    saveMember(member);
  }
  function setCougar(cougar: boolean) {
    member.player.cougar = cougar;
    saveMember(member);
  }
  const charges = $derived(chargesFor(memberId));
  const unpaid = $derived(charges.filter((c) => !c.paidOn));
  const paid = $derived(charges.filter((c) => c.paidOn));
  const owed = $derived(owedBy(memberId));
  const paidTotal = $derived(paid.reduce((s, c) => s + c.pence, 0));

  function payAll(via: "transfer" | "cash") {
    for (const c of unpaid) markPaid(c.id, via);
  }
</script>

<BackBar href="/settings/members" label="Members" title={member.player.name} />

<div class="page">
  <header class="who">
    <span class="avatar big">{initials(member.player.name)}</span>
    <span class="grow">
      <span class="name">{member.player.name}</span>
      <span class="hint">{emailFor(member.player)} · <span class="num">{referenceFor(memberId)}</span></span>
    </span>
  </header>

  <div class="two">
    <label class="field">
      Role
      <Select
        id="member-role"
        value={member.roles[0] ?? "Member"}
        onchange={setRole}
        options={db.roles.map((r) => ({ value: r.name, label: r.name }))}
      />
    </label>
    <label class="field">
      Plan
      <Select
        id="member-plan"
        bind:value={member.plan}
        options={[
          { value: "Pay as you go", label: "Pay as you go" },
          { value: "Subscription", label: "Subscription" },
        ]}
      />
    </label>
  </div>

  <div class="two">
    <div class="field">
      <span id="member-position">Position</span>
      <div class="seg" role="group" aria-labelledby="member-position">
        {#each Object.entries(POSITIONS) as [v, label] (v)}
          <button type="button" aria-pressed={member.player.position === v} onclick={() => setPosition(v as Position)}>
            {label}
          </button>
        {/each}
      </div>
    </div>
    <label class="field">
      Rating (0–100)
      <input
        class="input num"
        type="number"
        min="0"
        max="100"
        value={member.player.rating}
        onchange={(e) => setRating(Number(e.currentTarget.value))}
      />
    </label>
  </div>
  <label class="check">
    <input type="checkbox" checked={member.player.cougar} onchange={(e) => setCougar(e.currentTarget.checked)} />
    A Cougar (plays for the club's own team)
  </label>

  <div class="stats num">
    <div class="stat">
      <span class="eyebrow">Owes</span><span class="value" class:owes={owed > 0}>{pounds(owed)}</span>
    </div>
    <div class="stat"><span class="eyebrow">Paid</span><span class="value">{pounds(paidTotal)}</span></div>
    <div class="stat"><span class="eyebrow">Sessions</span><span class="value">{charges.length}</span></div>
  </div>

  <div class="head-row">
    <h2 class="section-title">Not paid yet</h2>
    {#if unpaid.length > 1}
      <span class="seg all" role="group" aria-label="Mark everything paid">
        <button onclick={() => payAll("transfer")}>All paid · transfer</button>
        <button onclick={() => payAll("cash")}>Cash</button>
      </span>
    {/if}
  </div>
  <div class="list">
    {#each unpaid as c (c.id)}<ChargeRow charge={c} editable />{:else}<p class="row hint">All square.</p>{/each}
  </div>

  <h2 class="section-title">Paid</h2>
  <div class="list">
    {#each paid as c (c.id)}<ChargeRow charge={c} editable />{:else}<p class="row hint">Nothing paid yet.</p>{/each}
  </div>
  <p class="hint">Tap Paid to take a payment back if it was marked by mistake.</p>
</div>

<style>
  .seg {
    display: flex;
  }
  .check {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    color: var(--fg-body);
  }
  .who {
    display: flex;
    align-items: center;
    gap: var(--s-4);
  }
  .who .grow {
    display: grid;
    min-width: 0;
  }
  .name {
    color: var(--fg);
    font-size: var(--text-lg);
    font-weight: 600;
  }
  .avatar.big {
    width: 3.5rem;
    height: 3.5rem;
    font-size: var(--text-md);
  }
  .owes {
    color: var(--red-hot);
  }
  .head-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--s-3);
  }
  .head-row .section-title {
    margin-bottom: 0;
  }
  .all button {
    min-height: 1.9rem;
    font-size: var(--text-xs);
  }
</style>
