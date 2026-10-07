<script lang="ts">
  // A member, opened for an admin (Teammates: a tap on their card or row, or a link to /more/teammates/:id). It
  // fills the space the page has, beside the dock and under the top bar (on a phone, the whole screen), the way
  // Gwenda's editors do: a header with who they are and a close button top right, then a body that scrolls on its
  // own. Details and attendance on the left, money on the right; one column when it's narrow. The card they were
  // tapped on turns away as it opens, and back as it closes. Every change saves as it's made.
  import { onMount, tick } from "svelte";
  import Icon from "../app/shell/Icon.svelte";
  import { EASE_IN, EASE_OUT, prefersReducedMotion } from "../app/motion";
  import PlayerCard from "./PlayerCard.svelte";
  import {
    attendanceOf,
    markHere,
    saveContact,
    saveMember,
    setQuarterly,
    type AttendanceRow,
  } from "../app/backend.svelte";
  import { POSITIONS, emailFor, phoneFor, referenceFor, type Position } from "../demo/data";
  import { chargesFor, owedBy } from "../demo/dues.svelte";
  import { db, markPaid } from "../demo/store.svelte";
  import ChargeRow from "./ChargeRow.svelte";
  import { formatDayDate, londonISO, londonToday, pounds } from "./dates";
  import { initials } from "./initials";
  import Select from "./Select.svelte";

  let {
    memberId,
    source,
    onclose,
  }: {
    memberId: number;
    /** The card that was tapped: it turns away as this opens. None (a row, a link) and this just grows in. */
    source?: HTMLElement;
    onclose: () => void;
  } = $props();

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
  // How to reach them; the email is what they sign in with. Saved when a field is left. The sheet is made afresh
  // for each member (Teammates keys it), so their stored values are read once, as it opens.
  const stored = () => ({
    email: emailFor(member.player) === "No email yet" ? "" : emailFor(member.player),
    phone: phoneFor(memberId) ?? "",
  });
  let email = $state(stored().email);
  let phone = $state(stored().phone);
  const saveContactNow = () => saveContact(memberId, email.trim(), phone.trim());
  function setPlan(plan: string) {
    member.plan = plan as typeof member.plan;
    setQuarterly(memberId, plan === "Subscription");
  }

  // Their attendance, a quarter at a time (Jan–Mar, Apr–Jun…), from the first quarter any training ran to this one.
  // Tap a Friday to say whether they came; it goes through the register's rules (a sign-up becomes a no-show or
  // back, anyone else is added or taken off).
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const today = londonToday();
  const thisYear = Number(today.slice(0, 4));
  const thisQuarter = thisYear * 4 + Math.floor((Number(today.slice(5, 7)) - 1) / 3);
  const firstQuarter = $derived(
    4 * Math.min(thisYear, ...db.series.map((s) => Number(s.startsOn.slice(0, 4))).filter(Number.isFinite)),
  );
  let quarter = $state(thisQuarter);
  const year = $derived(Math.floor(quarter / 4));
  const firstMonth = $derived((quarter % 4) * 3);
  const quarterLabel = $derived(`${MONTHS[firstMonth]}–${MONTHS[firstMonth + 2]} ${year}`);
  let attendance = $state<AttendanceRow[] | null>(null);
  // A year's rows at a time; a slow answer for a year no longer shown is dropped
  const load = (id: number, y: number) =>
    attendanceOf(id, String(y))
      .then((rows) => y === year && (attendance = rows))
      .catch(() => y === year && (attendance = []));
  $effect(() => {
    const y = year;
    attendance = null;
    load(memberId, y);
  });
  // The quarter's three months, each with its trainings in date order
  const months = $derived(
    [0, 1, 2].map((k) => {
      const m = firstMonth + k;
      const days = (attendance ?? []).filter((r) => Number(r.heldOn.slice(5, 7)) - 1 === m).reverse();
      return [MONTHS[m], days] as const;
    }),
  );
  const inQuarter = $derived(months.flatMap(([, days]) => days));
  const came = (r: AttendanceRow) => r.signup === "in" && r.attended !== false;
  function outcome(r: AttendanceRow): { label: string; kind: string } {
    if (r.cancelled) return { label: "Cancelled", kind: "cancelled" };
    if (came(r)) return { label: r.walkIn ? "Came (walk-in)" : "Came", kind: "came" };
    if (r.signup === "in") return { label: "No-show", kind: "noshow" };
    if (r.signup === "out") return { label: "Not there (said out)", kind: "" };
    if (r.signup === "waitlist") return { label: "Not there (waitlist)", kind: "" };
    return { label: "Not there", kind: "" };
  }

  async function toggleCame(r: AttendanceRow) {
    if (r.cancelled) return;
    const here = !came(r);
    // Show it at once; the server's word follows. Unticking a sign-up makes a no-show; anyone else comes off.
    if (here) Object.assign(r, { signup: "in", attended: true });
    else if (r.walkIn) Object.assign(r, { signup: null, attended: null, walkIn: false });
    else r.attended = false;
    await markHere(r.sessionId, memberId, here);
    await load(memberId, year);
  }

  const charges = $derived(chargesFor(memberId));
  const unpaid = $derived(charges.filter((c) => !c.paidOn));
  const paid = $derived(charges.filter((c) => c.paidOn));
  const owed = $derived(owedBy(memberId));
  const paidTotal = $derived(paid.reduce((s, c) => s + c.pence, 0));

  function payAll(via: "transfer" | "cash") {
    for (const c of unpaid) markPaid(c.id, via);
  }

  // Opening is one turn: the tapped card lifts, grows towards the middle and turns edge-on; the panel carries the
  // turn on from there, opening out from that spot to fill the space (its back is the panel). Closing runs it
  // backwards. With no card to start from (a row, a link) the panel just zooms in. Without motion it just appears.
  let panel = $state<HTMLElement | undefined>();
  let turning = $state<HTMLElement | undefined>();
  const rectOf = (el?: HTMLElement) => (el?.isConnected ? el.getBoundingClientRect() : null);
  let from = $state<DOMRect | null>(null);
  let closing = $state(false);
  // Light placeholders while it turns; the real fields mount once it has landed, so the turn stays smooth
  let ready = $state(false);
  // …and the placeholders fade out under them, then go
  let gone = $state(false);
  const ZOOM_IN = [
    { transform: "scale(0.94)", filter: "blur(8px)", opacity: 0 },
    { transform: "none", filter: "blur(0)", opacity: 1 },
  ];
  const CARD_MS = 170;
  const PANEL_MS = 320;
  // Shallow depth: a light turn, not a heavy swing
  const DEPTH = "perspective(2400px)";

  function portal(node: HTMLElement) {
    document.body.append(node);
    return { destroy: () => node.remove() };
  }

  // Where the tapped card lies, before anything paints over it
  $effect.pre(() => {
    if (!closing && !prefersReducedMotion) from = rectOf(source);
  });

  // The turn's two halves, from the card's place (s) to the panel's (p). Halfway, edge-on, the card is a bigger
  // card between the two; the panel starts there, clipped to that card's shape.
  function turnFrames(s: DOMRect, p: DOMRect) {
    const k = Math.max(1, Math.min(p.width / s.width, p.height / s.height) * 0.25);
    const cx = (s.left + s.width / 2 + p.left + p.width / 2) / 2;
    const cy = (s.top + s.height / 2 + p.top + p.height / 2) / 2;
    const [w, h] = [s.width * k, s.height * k];
    const card = [
      { transform: `translate(0, 0) scale(1) ${DEPTH} rotateY(0deg)` },
      {
        // The move comes before the depth, so the card is seen square on and edge-on is a line, not a skewed side
        transform: `translate(${cx - (s.left + s.width / 2)}px, ${cy - (s.top + s.height / 2)}px) scale(${k}) ${DEPTH} rotateY(90deg)`,
      },
    ];
    const radius = getComputedStyle(panel!).borderTopLeftRadius;
    const origin = `${cx - p.left}px ${cy - p.top}px`;
    const inset = [cy - h / 2 - p.top, p.right - (cx + w / 2), p.bottom - (cy + h / 2), cx - w / 2 - p.left];
    const back = [
      {
        clipPath: `inset(${inset.map((n) => `${n}px`).join(" ")} round ${8 * k}px)`,
        transform: `${DEPTH} rotateY(-90deg)`,
        transformOrigin: origin,
      },
      {
        clipPath: `inset(0px 0px 0px 0px round ${radius})`,
        transform: `${DEPTH} rotateY(0deg)`,
        transformOrigin: origin,
      },
    ];
    return { card, back };
  }

  onMount(() => {
    panel?.focus({ preventScroll: true });
    if (prefersReducedMotion || !panel) return void ((from = null), (ready = gone = true));
    let grow: Animation;
    if (from && turning) {
      const { card, back } = turnFrames(from, panel.getBoundingClientRect());
      turning.animate(card, {
        duration: CARD_MS,
        easing: "cubic-bezier(0.4, 0, 1, 1)",
        fill: "forwards",
      }).onfinish = () => (from = null);
      grow = panel.animate(back, {
        duration: PANEL_MS,
        delay: CARD_MS,
        easing: "cubic-bezier(0, 0, 0.2, 1)",
        fill: "backwards",
      });
    } else {
      grow = panel.animate(ZOOM_IN, { duration: 440, easing: EASE_OUT });
    }
    grow.onfinish = () => (ready = true);
  });

  async function close() {
    if (closing) return;
    closing = true;
    if (prefersReducedMotion || !panel) return onclose();
    // The card goes back where it came from, if it's still there
    from = rectOf(source);
    await tick();
    if (!from || !turning) {
      panel.animate([...ZOOM_IN].reverse(), { duration: 240, easing: EASE_IN, fill: "forwards" }).onfinish = () =>
        onclose();
      return;
    }
    const { card, back } = turnFrames(from, panel.getBoundingClientRect());
    panel.animate([...back].reverse(), { duration: 220, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" });
    turning.animate([...card].reverse(), {
      duration: CARD_MS + 30,
      delay: 220,
      easing: "cubic-bezier(0, 0, 0.2, 1)",
      fill: "both",
    }).onfinish = () => onclose();
  }

  function onkeydown(e: KeyboardEvent) {
    // A menu's own Escape (Select) closes just the menu
    if (e.key === "Escape" && !e.defaultPrevented) close();
  }
</script>

<svelte:window {onkeydown} />

<div class="sheet-layer" class:closing use:portal>
  <button class="scrim" aria-label="Close" tabindex="-1" onclick={close}></button>
  {#if from}
    <div
      class="turning"
      bind:this={turning}
      style:left="{from.left}px"
      style:top="{from.top}px"
      style:width="{from.width}px"
      style:height="{from.height}px"
      aria-hidden="true"
    >
      <PlayerCard player={member.player} />
    </div>
  {/if}
  <div class="panel" role="dialog" aria-modal="true" aria-labelledby="member-name" tabindex="-1" bind:this={panel}>
    <!-- The header is the player: who they are, then their details in one row -->
    <header class="panel-head">
      <div class="who">
        <span class="avatar big">{initials(member.player.name)}</span>
        <div class="titles">
          <p class="eyebrow">
            Member · {POSITIONS[member.player.position]}{member.plan === "Subscription" ? " · Quarterly" : ""}
            {#if member.player.cougar}<span class="badge red">Cougar</span>{/if}
          </p>
          <h1 id="member-name">{member.player.name}</h1>
          <p class="sub">{emailFor(member.player)} · <span class="num">{referenceFor(memberId)}</span></p>
        </div>
        <button class="btn ghost icon close" aria-label="Close" onclick={close}>
          <Icon name="x" size={18} />
        </button>
      </div>

      <div class="stack">
        {#if !gone}
          <div class="details ph-layer" class:out={ready} aria-hidden="true" onanimationend={() => (gone = true)}>
            {#each ["role", "plan", "position", "rating", "team", "email", "phone"] as k (k)}<i class="ph field-ph {k}"
              ></i>{/each}
          </div>
        {/if}
        {#if ready}
          <div class="details in">
            <label class="field role">
              Role
              <Select
                id="member-role"
                value={member.roles[0] ?? "Member"}
                onchange={setRole}
                options={db.roles.map((r) => ({ value: r.name, label: r.name }))}
              />
            </label>
            <label class="field plan">
              Plan
              <Select
                id="member-plan"
                value={member.plan}
                onchange={setPlan}
                options={[
                  { value: "Pay as you go", label: "Pay as you go" },
                  { value: "Subscription", label: "Quarterly Member" },
                ]}
              />
            </label>
            <div class="field position">
              <span id="member-position">Position</span>
              <div class="seg" role="group" aria-labelledby="member-position">
                {#each Object.entries(POSITIONS) as [v, label] (v)}
                  <button
                    type="button"
                    aria-pressed={member.player.position === v}
                    onclick={() => setPosition(v as Position)}
                  >
                    {label}
                  </button>
                {/each}
              </div>
            </div>
            <label class="field rating">
              Rating
              <input
                class="input num"
                type="number"
                min="0"
                max="100"
                value={member.player.rating}
                onchange={(e) => setRating(Number(e.currentTarget.value))}
              />
            </label>
            <div class="field team">
              <span id="member-team">Cougars team</span>
              <div class="seg" role="group" aria-labelledby="member-team">
                <button type="button" aria-pressed={member.player.cougar} onclick={() => setCougar(true)}>On it</button>
                <button type="button" aria-pressed={!member.player.cougar} onclick={() => setCougar(false)}>Not</button>
              </div>
            </div>
            <label class="field email">
              Email (they sign in with it)
              <input
                class="input"
                type="email"
                autocomplete="off"
                placeholder="None yet"
                bind:value={email}
                onchange={saveContactNow}
              />
            </label>
            <label class="field phone">
              Phone
              <input class="input" type="tel" autocomplete="off" bind:value={phone} onchange={saveContactNow} />
            </label>
          </div>
        {/if}
      </div>
    </header>

    <!-- The rest of the card: attendance, then fees -->
    <div class="body stack">
      {#if !gone}
        <div class="ph-layer" class:out={ready} aria-hidden="true">
          <section><i class="ph line"></i><i class="ph block"></i></section>
          <section><i class="ph line"></i><i class="ph rows"></i></section>
        </div>
      {/if}
      {#if ready}
        <div>
          <section class="in">
            <div class="head-row">
              <h2>Attendance</h2>
              <span class="steps" role="group" aria-label="Quarter">
                <button
                  class="btn ghost icon"
                  aria-label="Quarter before"
                  disabled={quarter <= firstQuarter}
                  onclick={() => quarter--}
                >
                  <Icon name="chevronLeft" size={18} />
                </button>
                <span class="step-label num" aria-live="polite">{quarterLabel}</span>
                <button
                  class="btn ghost icon"
                  aria-label="Quarter after"
                  disabled={quarter >= thisQuarter}
                  onclick={() => quarter++}
                >
                  <Icon name="chevronRight" size={18} />
                </button>
              </span>
            </div>
            <p class="legend hint">
              <span><i class="dot came"></i>Came {inQuarter.filter(came).length}</span>
              <span
                ><i class="dot noshow"></i>No-show {inQuarter.filter((r) => r.signup === "in" && !came(r)).length}</span
              >
              <span><i class="dot"></i>Not there</span>
              <span>Played {member.player.played ?? 0} in all</span>
              <span class="tap">Tap a Friday to change it</span>
            </p>
            <!-- The quarter as a calendar: a row per month, its trainings across it week by week -->
            <div class="months">
              {#each months as [month, days] (month)}
                <span class="month">{month}</span>
                <div class="weeks">
                  {#if attendance === null}
                    <span class="hint">Loading…</span>
                  {/if}
                  {#each days as r (r.sessionId)}
                    {@const o = outcome(r)}
                    <button
                      class="day {o.kind}"
                      disabled={r.cancelled}
                      title="{r.series}, {formatDayDate(londonISO(r.heldOn, '12:00'))}: {o.label}"
                      aria-label="{r.series}, {formatDayDate(londonISO(r.heldOn, '12:00'))}: {o.label}"
                      onclick={() => toggleCame(r)}
                    >
                      <span class="d num">{Number(r.heldOn.slice(8))}</span>
                    </button>
                  {:else}
                    {#if attendance !== null}<span class="hint">No trainings</span>{/if}
                  {/each}
                </div>
              {/each}
            </div>
          </section>

          <section class="in">
            <div class="head-row">
              <h2>Fees</h2>
              <span class="totals hint num">
                Owes <b class:owes={owed > 0}>{pounds(owed)}</b> · Paid <b>{pounds(paidTotal)}</b>
              </span>
            </div>
            <div class="head-row">
              <h3 class="eyebrow">Not paid yet</h3>
              {#if unpaid.length > 1}
                <span class="seg sm" role="group" aria-label="Mark everything paid">
                  <button onclick={() => payAll("transfer")}>All paid · transfer</button>
                  <button onclick={() => payAll("cash")}>Cash</button>
                </span>
              {/if}
            </div>
            <div class="list">
              {#each unpaid as c (c.id)}<ChargeRow charge={c} editable />{:else}<p class="row hint">
                  All square.
                </p>{/each}
            </div>
            <h3 class="eyebrow">Paid</h3>
            <div class="list">
              {#each paid as c (c.id)}<ChargeRow charge={c} editable />{:else}<p class="row hint">
                  Nothing paid yet.
                </p>{/each}
            </div>
            {#if paid.length}<p class="hint">Tap Paid to take a payment back if it was marked by mistake.</p>{/if}
          </section>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  /* The space the page has: beside the dock, under the top bar. A phone gives it the whole screen. */
  .sheet-layer {
    position: fixed;
    inset: 0;
    z-index: 80;
  }
  .scrim {
    position: absolute;
    inset: 0;
    border: 0;
    padding: 0;
    background: color-mix(in srgb, var(--bg) 70%, transparent);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    animation: fade-in 260ms var(--ease) both;
  }
  .closing .scrim {
    animation: fade-out 300ms 80ms var(--ease) both;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }
  @keyframes fade-out {
    to {
      opacity: 0;
    }
  }
  .turning {
    position: fixed;
    z-index: 2;
    pointer-events: none;
  }
  .turning :global(.slot) {
    height: 100%;
  }
  .panel {
    position: absolute;
    inset: 4.5rem var(--s-6) var(--s-6) 6.25rem;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--r-xl);
    background: var(--surface-1);
    box-shadow: 0 30px 80px -30px rgb(0 0 0 / 0.8);
    transform-origin: 50% 40%;
    outline: none;
  }
  @media (max-width: 900px) {
    .panel {
      inset: 0;
      border: 0;
      border-radius: 0;
    }
  }

  /* Header: the player. Who they are with the close button top right, then their details in one aligned row. */
  .panel-head {
    display: grid;
    gap: var(--s-5);
    padding: var(--s-5) var(--s-5) var(--s-5) var(--s-6);
    border-bottom: 1px solid var(--border);
    container-type: inline-size;
  }
  .who {
    display: flex;
    align-items: center;
    gap: var(--s-4);
  }
  .titles {
    flex: 1;
    min-width: 0;
  }
  .close {
    align-self: flex-start;
  }
  .eyebrow .badge {
    margin-left: var(--s-1);
    letter-spacing: normal;
    text-transform: none;
  }
  h1 {
    margin: var(--s-1) 0 0;
    color: var(--fg);
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 3vw, 2.1rem);
    font-style: italic;
    font-weight: 400;
    line-height: 1.05;
    text-transform: uppercase;
  }
  .sub {
    margin-top: var(--s-1);
    overflow: hidden;
    color: var(--fg-muted);
    font-size: var(--text-sm);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* Every field the same height, labels on one line: one row when there's room, two when not, one on a phone */
  .details {
    display: grid;
    grid-template-columns:
      minmax(9rem, 1fr) minmax(10rem, 1.1fr) minmax(16rem, 1.7fr) minmax(5.5rem, 0.5fr)
      minmax(9rem, 0.9fr);
    gap: var(--s-4);
    align-items: start;
  }
  /* A second row: how to reach them */
  .email {
    grid-column: 1 / 4;
  }
  .phone {
    grid-column: 4 / 6;
  }
  .seg {
    display: flex;
  }
  .seg > button {
    flex: 1;
  }
  @container (max-width: 62rem) {
    .details {
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }
    .role,
    .plan,
    .rating,
    .team {
      grid-column: span 3;
    }
    .position {
      grid-column: span 6;
    }
    .ph.role,
    .ph.plan,
    .ph.rating,
    .ph.team {
      grid-column: span 3;
    }
    .ph.position {
      grid-column: span 6;
    }
    .email,
    .phone {
      grid-column: span 3;
    }
  }
  @container (max-width: 30rem) {
    .email,
    .phone {
      grid-column: span 6;
    }
  }
  @media (max-width: 600px) {
    .panel-head {
      padding: var(--s-4);
    }
    .avatar.big {
      display: none;
    }
  }

  .body {
    flex: 1;
    min-height: 0;
    padding: 0 var(--s-6) var(--s-6);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  /* A phone: the header's fields would leave no room, so the whole card scrolls */
  @media (max-width: 600px) {
    .panel {
      overflow-y: auto;
    }
    .body {
      flex: none;
      padding: 0 var(--s-4) var(--s-6);
      overflow: visible;
    }
  }
  /* Sections divided by a rule, not boxed */
  section {
    display: grid;
    gap: var(--s-3);
    align-content: start;
    padding-block: var(--s-5) var(--s-6);
  }
  section + section {
    border-top: 1px solid var(--border);
  }
  h2 {
    color: var(--fg);
    font-size: var(--text-md);
    font-weight: 600;
  }
  h3.eyebrow {
    margin-top: var(--s-2);
  }
  /* The real fields fade in exactly where they'll stay, each in turn, along the header row then down the body */
  .details.in > *,
  section.in {
    /* backwards, not both: a fill that outlives the fade keeps each field its own stacking context, and a later
       field would paint over an open Select menu */
    animation: field-in 320ms var(--ease) backwards;
  }
  .details.in > :nth-child(2) {
    animation-delay: 40ms;
  }
  .details.in > :nth-child(3) {
    animation-delay: 80ms;
  }
  .details.in > :nth-child(4) {
    animation-delay: 120ms;
  }
  .details.in > :nth-child(5) {
    animation-delay: 160ms;
  }
  .details.in > :nth-child(6) {
    animation-delay: 200ms;
  }
  .details.in > :nth-child(7) {
    animation-delay: 240ms;
  }
  section.in {
    animation-delay: 140ms;
  }
  section.in + section.in {
    animation-delay: 220ms;
  }
  @keyframes field-in {
    from {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .details.in > *,
    section.in {
      animation: none;
    }
  }
  /* Placeholders and the real thing share one cell, so one can fade over the other */
  .stack {
    position: relative;
    display: grid;
  }
  .stack > * {
    grid-area: 1 / 1;
    min-width: 0;
  }
  .ph-layer {
    align-self: start;
    pointer-events: none;
  }
  /* Fading out, they no longer hold the space open, so the real fields set the size and nothing moves when they go */
  .ph-layer.out {
    position: absolute;
    inset: 0 0 auto;
    animation: fade-out 360ms 80ms var(--ease) both;
  }
  /* Placeholders: soft slabs where the fields will be */
  .ph {
    display: block;
    border-radius: var(--r-md);
    background: var(--surface-2);
  }
  .ph.line {
    width: 7rem;
    height: 1.1rem;
  }
  /* A label and a field: as tall as the real ones */
  .ph.field-ph {
    height: 4.375rem;
  }
  .ph.block {
    height: 11rem;
  }
  .ph.rows {
    height: 8rem;
  }
  .head-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
  }
  .steps {
    display: inline-flex;
    align-items: center;
    gap: var(--s-1);
  }
  /* Wide enough for any quarter, so the arrows never move */
  .step-label {
    min-width: 7.5rem;
    color: var(--fg);
    font-weight: 600;
    text-align: center;
  }
  .totals b {
    color: var(--fg);
    font-weight: 600;
  }
  .totals b.owes {
    color: var(--red-hot);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2) var(--s-4);
  }
  .legend .tap {
    margin-left: auto;
  }
  .dot {
    display: inline-block;
    width: 0.6rem;
    height: 0.6rem;
    margin-right: var(--s-1);
    border-radius: 2px;
    background: color-mix(in srgb, var(--fg) 12%, transparent);
  }
  .dot.came {
    background: var(--green);
  }
  .dot.noshow {
    background: var(--red-hot);
  }
  /* The quarter as a calendar: month names down the side, a tile per training across, filled by what happened */
  .months {
    display: grid;
    grid-template-columns: 2.75rem 1fr;
    gap: var(--s-2) var(--s-3);
    align-items: center;
  }
  .month {
    color: var(--fg-muted);
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .weeks {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2);
    min-height: 2.5rem;
  }
  .day {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    border: 0;
    border-radius: var(--r-sm);
    background: color-mix(in srgb, var(--fg) 7%, transparent);
    color: var(--fg-muted);
    line-height: 1;
    transition: background-color var(--t-fast) var(--ease-in-out);
  }
  .day:hover:not(:disabled) {
    background: color-mix(in srgb, var(--fg) 14%, transparent);
  }
  .day .d {
    font-family: var(--font-display);
    font-size: var(--text-md);
  }
  .day.came {
    background: color-mix(in srgb, var(--green) 30%, transparent);
    color: var(--fg);
  }
  .day.noshow {
    background: color-mix(in srgb, var(--red) 30%, transparent);
    color: var(--fg);
  }
  .day.cancelled {
    opacity: 0.35;
    text-decoration: line-through;
  }
</style>
