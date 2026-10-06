<script lang="ts">
  import {
    createTournament,
    createTournamentType,
    updateTournament,
    updateTournamentType,
  } from "../app/backend.svelte";
  // Settings → Tournaments (ADR 0030). A tournament type is a kind the club hosts (The Cougars Kumite): its format
  // and rules. Each tournament is one edition, scheduled on its own with a name, location and date. A new type gets
  // its own section in the menu; a new edition shows on the calendar and the type's pages.
  import PageHeader from "../lib/PageHeader.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import type { Tournament, TournamentStatus, TournamentType } from "../demo/model";
  import { db } from "../demo/store.svelte";
  import StylePicker from "../lib/StylePicker.svelte";
  import { formatDayDate, londonISO, londonToday, pounds } from "../lib/dates";
  import { collectedFor } from "../demo/dues.svelte";
  import Select from "../lib/Select.svelte";

  const STATUSES: { id: TournamentStatus; label: string }[] = [
    { id: "planned", label: "Coming up" },
    { id: "open", label: "Sign-up open" },
    { id: "live", label: "Live" },
    { id: "finished", label: "Finished" },
  ];

  let selected = $state<number | "new" | null>(db.tournamentTypes[0]?.id ?? null);
  let form = $state<TournamentType | null>(null);
  let saved = $state(false);

  const blank = (): TournamentType => ({
    id: 0,
    slug: "",
    name: "",
    shortName: "",
    icon: "trophy",
    tone: "violet",
    format: "round_robin",
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    gameMinutes: 12,
    draft: false,
    active: true,
    defaultFeePence: 1500,
  });

  $effect(() => {
    const t = selected === "new" ? blank() : db.tournamentTypes.find((x) => x.id === selected);
    form = t ? structuredClone($state.snapshot(t)) : null;
    saved = false;
    adding = false;
  });

  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (!form || !form.name) return;
    if (!form.shortName) form.shortName = form.name.replace(/^The\s+/i, "").split(" ")[0];
    if (selected === "new") {
      const created = await createTournamentType(form);
      if (created) selected = created.id;
    } else {
      saved = Boolean(await updateTournamentType(form));
    }
  }

  // ─── Editions ───
  const editions = $derived(
    typeof selected === "number"
      ? db.tournaments.filter((t) => t.typeId === selected).sort((a, b) => b.heldOn.localeCompare(a.heldOn))
      : [],
  );
  let adding = $state(false);
  let edition = $state({
    name: "",
    heldOn: "",
    startTime: "11:00",
    endTime: "16:00",
    location: "",
    capacity: 24,
    fee: "",
  });
  // A new edition starts at the type's default fee, and can be changed before it's scheduled.
  function startAdding() {
    adding = !adding;
    if (adding && form) edition.fee = String(form.defaultFeePence / 100);
  }

  async function addEdition(e: SubmitEvent) {
    e.preventDefault();
    if (typeof selected !== "number" || !edition.name || !edition.heldOn) return;
    const t: Tournament = {
      id: 0,
      typeId: selected,
      name: edition.name,
      location: edition.location,
      heldOn: edition.heldOn,
      startTime: edition.startTime,
      endTime: edition.endTime,
      capacity: edition.capacity || null,
      status: "planned",
      feePence: Math.round(Number(edition.fee || 0) * 100),
      going: [],
      waitlist: [],
    };
    if (!(await createTournament(t))) return;
    adding = false;
    edition = { name: "", heldOn: "", startTime: "11:00", endTime: "16:00", location: "", capacity: 24, fee: "" };
  }
</script>

<div class="page">
  <PageHeader
    title="Tournaments"
    subtitle="The tournaments the club hosts. Each type gets its own section in the menu."
  >
    {#snippet actions()}
      <button class="btn sm outline" onclick={() => (selected = "new")}><Icon name="plus" size={16} /> Type</button>
    {/snippet}
  </PageHeader>

  <div class="list">
    {#each db.tournamentTypes as t (t.id)}
      {@const next = db.tournaments
        .filter((x) => x.typeId === t.id && x.heldOn >= londonToday())
        .sort((a, b) => a.heldOn.localeCompare(b.heldOn))[0]}
      <button class="row" class:on={t.id === selected} onclick={() => (selected = t.id)}>
        <span class="chip" style:--tone="var(--tone-{t.tone})"><Icon name={t.icon} size={18} /></span>
        <span class="grow">
          <span class="title">{t.name}</span>
          <span class="sub">
            {next
              ? `Next: ${next.name}, ${formatDayDate(londonISO(next.heldOn, next.startTime))}`
              : "Nothing scheduled"}
          </span>
        </span>
        {#if !t.active}<span class="badge">Paused</span>{/if}
        <Icon name="chevronRight" size={18} />
      </button>
    {/each}
  </div>

  {#if form}
    {#key selected}
      <form class="panel pad form rise" onsubmit={save}>
        <h2>{selected === "new" ? "New tournament type" : form.name}</h2>
        <div class="two">
          <label class="field"
            >Name <input class="input" bind:value={form.name} placeholder="e.g. Summer Cup" required /></label
          >
          <label class="field">
            Short name <input class="input" bind:value={form.shortName} placeholder="e.g. Cup" maxlength="12" />
          </label>
        </div>
        <StylePicker bind:icon={form.icon} bind:tone={form.tone} />
        <div class="field">
          Format
          <p class="value">Round robin: every team plays every other once</p>
        </div>
        <div class="three">
          <label class="field">Win <input class="input num" type="number" min="0" bind:value={form.pointsWin} /></label>
          <label class="field"
            >Draw <input class="input num" type="number" min="0" bind:value={form.pointsDraw} /></label
          >
          <label class="field"
            >Loss <input class="input num" type="number" min="0" bind:value={form.pointsLoss} /></label
          >
        </div>
        <label class="field">
          Game length (minutes)
          <input class="input num" type="number" min="1" max="60" bind:value={form.gameMinutes} />
        </label>
        <label class="field">
          Default fee (£)
          <input
            class="input num"
            inputmode="decimal"
            value={form.defaultFeePence / 100}
            onchange={(e) => form && (form.defaultFeePence = Math.round(Number(e.currentTarget.value || 0) * 100))}
          />
          <span class="hint small">Each new date starts at this; change it there if one costs more or less.</span>
        </label>
        <label class="check"><input type="checkbox" bind:checked={form.draft} /> Captains draft the teams</label>
        <label class="check"
          ><input type="checkbox" bind:checked={form.active} /> Running (untick to hide it from the menu)</label
        >
        <div class="actions">
          <button class="btn primary">{selected === "new" ? "Add tournament type" : "Save"}</button>
          {#if saved}<span class="badge green rise">Saved</span>{/if}
        </div>
      </form>
    {/key}

    {#if typeof selected === "number"}
      <div class="editions-head">
        <h2 class="section-title">Dates</h2>
        <button class="btn sm" class:primary={!adding} class:ghost={adding} onclick={startAdding}>
          {adding ? "Cancel" : `+ ${form.shortName || "Tournament"}`}
        </button>
      </div>

      {#if adding}
        <form class="panel pad form rise" onsubmit={addEdition}>
          <label class="field"
            >Name <input
              class="input"
              bind:value={edition.name}
              placeholder="e.g. Winter {form.shortName}"
              required
            /></label
          >
          <div class="two">
            <label class="field">Date <input class="input" type="date" bind:value={edition.heldOn} required /></label>
            <label class="field"
              >Location <input class="input" bind:value={edition.location} placeholder="e.g. The rink" /></label
            >
          </div>
          <div class="three">
            <label class="field">Starts <input class="input" type="time" bind:value={edition.startTime} /></label>
            <label class="field">Ends <input class="input" type="time" bind:value={edition.endTime} /></label>
            <label class="field"
              >Places <input class="input num" type="number" min="0" bind:value={edition.capacity} /></label
            >
          </div>
          <label class="field">Fee (£) <input class="input num" inputmode="decimal" bind:value={edition.fee} /></label>
          <button class="btn primary">Schedule it</button>
        </form>
      {/if}

      <div class="list">
        {#each editions as t (t.id)}
          {@const c = collectedFor("tournament", t.id)}
          <div class="row">
            <span class="grow">
              <span class="title">{t.name}</span>
              <span class="sub"
                >{formatDayDate(londonISO(t.heldOn, t.startTime))} · {t.startTime}–{t.endTime} · {t.location}</span
              >
              <span class="sub num">
                {pounds(t.feePence)} each{c.people ? ` · collected ${pounds(c.paid)} of ${pounds(c.due)}` : ""}
              </span>
            </span>
            <label class="fee">
              <span class="sr-only">Fee for {t.name} (£)</span>
              <input
                class="input num"
                inputmode="decimal"
                value={t.feePence / 100}
                disabled={c.people > 0}
                title={c.people ? "Already charged: the fee is fixed" : "Fee (£)"}
                onchange={(e) => {
                  t.feePence = Math.round(Number(e.currentTarget.value || 0) * 100);
                  updateTournament(t);
                }}
              />
            </label>
            <Select
              id="status-{t.id}"
              size="sm"
              class="status"
              bind:value={t.status}
              onchange={() => updateTournament(t)}
              options={STATUSES.map((s) => ({ value: s.id, label: s.label }))}
              aria-label="Status of {t.name}"
            />
          </div>
        {:else}
          <p class="row hint">None scheduled yet.</p>
        {/each}
      </div>
      <p class="hint">Sign-up open lets members say they're in; it shows on the calendar either way.</p>
    {/if}
  {/if}
</div>

<style>
  .row.on {
    background: color-mix(in srgb, var(--fg) 6%, transparent);
  }
  .chip {
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    flex-shrink: 0;
    border-radius: var(--r-md);
    background: color-mix(in srgb, var(--tone) 18%, transparent);
    color: var(--tone);
  }
  .form h2 {
    font-size: var(--text-md);
    font-weight: 600;
  }
  .fee input {
    width: 4.5rem;
    height: var(--control-h-sm);
    padding: 0 var(--s-2);
    text-align: right;
  }
  .small {
    font-size: var(--text-xs);
  }
  .three {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--s-3);
  }
  .value {
    color: var(--fg-body);
  }
  .check {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    color: var(--fg-body);
  }
  .actions {
    display: flex;
    align-items: center;
    gap: var(--s-3);
  }
  .editions-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .editions-head .section-title {
    margin: 0 var(--s-1);
  }
  .row :global(.status) {
    flex-shrink: 0;
    width: 9rem;
  }
</style>
