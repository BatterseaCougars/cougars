<script lang="ts">
  // One tournament type's editor, inside the panel a card opens (Settings → Tournaments), as training's is (ADR 0030).
  // A type is a kind the club hosts (The Cougars Kumite): its format and rules. Below it, its dates: each tournament
  // is one edition, scheduled on its own with a name, location and date. A new type gets its own section in the
  // menu; a new edition shows on the calendar and the type's pages.
  import {
    createTournament,
    createTournamentType,
    updateTournament,
    updateTournamentType,
  } from "../app/backend.svelte";
  import type { Tournament, TournamentStatus, TournamentType } from "../demo/model";
  import { db } from "../demo/store.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import StylePicker from "./StylePicker.svelte";
  import { pounds } from "./dates";
  import { whenOf } from "../demo/schedule.svelte";
  import { collectedFor } from "../demo/dues.svelte";
  import Select from "./Select.svelte";
  import Sheet from "./Sheet.svelte";
  import { formatDayDate, londonISO } from "./dates";

  const STATUSES: { id: TournamentStatus; label: string }[] = [
    { id: "planned", label: "Coming up" },
    { id: "open", label: "Sign-up open" },
    { id: "live", label: "Live" },
    { id: "finished", label: "Finished" },
  ];

  let { typeId, oncreated }: { typeId?: number; oncreated?: (id: number) => void } = $props();

  const selected = $derived<number | "new">(typeId ?? "new");
  let form = $state<TournamentType | null>(null);

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
    location: "",
    awards: [
      { name: "Champions", about: "The team on top of the table at the end of the day." },
      { name: "Top scorer", about: "Most goals across every game." },
    ],
  });
  const MAX_AWARDS = 8;

  $effect(() => {
    const t = selected === "new" ? blank() : db.tournamentTypes.find((x) => x.id === selected);
    form = t ? structuredClone($state.snapshot(t)) : null;
    sheetOpen = false;
  });

  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (!form || !form.name) return;
    if (!form.shortName) form.shortName = form.name.replace(/^The\s+/i, "").split(" ")[0];
    if (selected === "new") {
      const created = await createTournamentType(form);
      // The blank form gives way to the new type's editor, in the same panel
      if (created) oncreated?.(created.id);
    } else {
      await updateTournamentType(form);
    }
  }

  // ─── Dates ───
  // Each date opens in a sheet with all its details; + Date opens the same sheet, empty. A date's location is its
  // type's unless it has its own (ADR 0046).
  const editions = $derived(
    typeof selected === "number"
      ? db.tournaments.filter((t) => t.typeId === selected).sort((a, b) => b.heldOn.localeCompare(a.heldOn))
      : [],
  );
  const members = $derived(
    db.members.filter((m) => m.status === "active").sort((a, b) => a.player.name.localeCompare(b.player.name)),
  );
  const nameOf = (id: number) => db.members.find((m) => m.player.id === id)?.player.name ?? "Someone";
  const dayOf = (day: string) => formatDayDate(londonISO(day, "12:00"));

  interface DateForm {
    id: number;
    name: string;
    heldOn: string;
    dateConfirmed: boolean;
    startTime: string;
    endTime: string;
    location: string;
    capacity: number | null;
    fee: string;
    status: TournamentStatus;
    public: boolean;
    signupClosesOn: string;
    draftOn: string;
    draftTime: string;
    captains: number[];
  }
  let sheetOpen = $state(false);
  let date = $state<DateForm | null>(null);
  /** Already charged: the fee is fixed. */
  const charged = $derived(date && date.id ? collectedFor("tournament", date.id).people > 0 : false);

  function openDate(t?: Tournament) {
    if (!form) return;
    date = t
      ? {
          id: t.id,
          name: t.name,
          heldOn: t.heldOn,
          dateConfirmed: t.dateConfirmed,
          startTime: t.startTime,
          endTime: t.endTime,
          location: t.location,
          capacity: t.capacity,
          fee: String(t.feePence / 100),
          status: t.status,
          public: t.public,
          signupClosesOn: t.signupClosesOn ?? "",
          draftOn: t.draftOn ?? "",
          draftTime: t.draftTime ?? "",
          captains: [...t.captains],
        }
      : {
          id: 0,
          name: "",
          heldOn: "",
          dateConfirmed: true,
          startTime: "11:00",
          endTime: "16:00",
          location: "",
          capacity: 24,
          fee: String(form.defaultFeePence / 100),
          status: "planned",
          public: true,
          signupClosesOn: "",
          draftOn: "",
          draftTime: "19:00",
          captains: [],
        };
    sheetOpen = true;
  }

  const toTournament = (d: DateForm, typeId: number): Tournament => ({
    id: d.id,
    typeId,
    name: d.name,
    location: d.location.trim(),
    venue: d.location.trim() || (form?.location ?? ""),
    heldOn: d.heldOn,
    startTime: d.startTime,
    endTime: d.endTime,
    capacity: d.capacity || null,
    status: d.status,
    feePence: Math.round(Number(d.fee || 0) * 100),
    dateConfirmed: d.dateConfirmed,
    public: d.public,
    signupClosesOn: d.signupClosesOn || null,
    draftOn: form?.draft && d.draftOn ? d.draftOn : null,
    draftTime: form?.draft && d.draftOn && d.draftTime ? d.draftTime : null,
    captains: form?.draft ? d.captains : [],
    going: [],
    waitlist: [],
  });

  async function saveDate(e: SubmitEvent) {
    e.preventDefault();
    if (typeof selected !== "number" || !date || !date.name || !date.heldOn) return;
    const t = toTournament(date, selected);
    const done = date.id ? await updateTournament(t) : await createTournament(t);
    if (done !== null) sheetOpen = false;
  }

  // Captains: picked from the active members, in the order they'll pick
  let captainPick = $state("");
  function addCaptain(id: string) {
    if (date && id && !date.captains.includes(Number(id))) date.captains.push(Number(id));
    captainPick = "";
  }
  function moveCaptain(i: number, by: -1 | 1) {
    if (!date) return;
    const [c] = date.captains.splice(i, 1);
    date.captains.splice(i + by, 0, c);
  }
</script>

<div class="editor">
  {#if form}
    {#key selected}
      <!-- Saved from the panel's footer (form="tournament-form") -->
      <form class="form" id="tournament-form" onsubmit={save}>
        <div class="checks">
          <label class="check"><input type="checkbox" bind:checked={form.active} /> Running</label>
          <label class="check"><input type="checkbox" bind:checked={form.draft} /> Captains draft the teams</label>
          <span class="hint">Untick Running to hide it from the menu.</span>
        </div>
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
        <label class="field">
          Location
          <input class="input" bind:value={form.location} placeholder="e.g. Battersea Sports Centre" maxlength="120" />
          <span class="hint small">Where its dates are, unless a date says otherwise.</span>
        </label>

        <!-- Awards: what's handed out at each date, shown on the website. A fun one is half the point. -->
        <div class="field">
          <span>Awards <span class="hint">· on the website</span></span>
          {#each form.awards as award, i (i)}
            <div class="award">
              <input
                class="input"
                aria-label="Award"
                placeholder="e.g. The Dim Mak"
                maxlength="40"
                bind:value={award.name}
              />
              <input
                class="input"
                aria-label="What it's for"
                placeholder="e.g. Fastest goal from a faceoff"
                maxlength="120"
                bind:value={award.about}
              />
              <button
                type="button"
                class="btn sm ghost"
                aria-label="Remove {award.name || 'this award'}"
                onclick={() => form?.awards.splice(i, 1)}
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          {/each}
          {#if form.awards.length < MAX_AWARDS}
            <button type="button" class="btn sm add-award" onclick={() => form?.awards.push({ name: "", about: "" })}>
              <Icon name="plus" size={16} />Award
            </button>
          {/if}
        </div>
      </form>
    {/key}

    {#if typeof selected === "number"}
      <div class="editions-head">
        <h2>Dates</h2>
        <button class="btn sm primary" onclick={() => openDate()} aria-haspopup="dialog">
          <Icon name="plus" size={16} />Date
        </button>
      </div>

      <div class="list">
        {#each editions as t (t.id)}
          {@const c = collectedFor("tournament", t.id)}
          <div class="row">
            <button type="button" class="grow open" onclick={() => openDate(t)} aria-haspopup="dialog">
              <span class="title">{t.name}</span>
              <span class="sub">{[whenOf(t), t.venue].filter(Boolean).join(" · ")}</span>
              <span class="sub num">
                {[
                  `${pounds(t.feePence)} each`,
                  c.people ? `collected ${pounds(c.paid)} of ${pounds(c.due)}` : "",
                  t.signupClosesOn ? `sign-up closes ${dayOf(t.signupClosesOn)}` : "",
                  t.draftOn ? `draft ${dayOf(t.draftOn)}` : "",
                  t.captains.length ? `${t.captains.length} captain${t.captains.length === 1 ? "" : "s"}` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </button>
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
      <p class="hint">
        Sign-up open lets members say they're in, until sign-up closes; it shows on the calendar either way.
      </p>

      <Sheet bind:open={sheetOpen} title={date?.id ? `Edit ${date.name}` : "Add a date"}>
        {#if date}
          <form class="form" onsubmit={saveDate}>
            <label class="field"
              >Name <input
                class="input"
                bind:value={date.name}
                placeholder="e.g. Winter {form.shortName}"
                required
              /></label
            >
            <div class="two">
              <label class="field">Date <input class="input" type="date" bind:value={date.heldOn} required /></label>
              <label class="check tbc"
                ><input
                  type="checkbox"
                  checked={!date.dateConfirmed}
                  onchange={(e) => date && (date.dateConfirmed = !e.currentTarget.checked)}
                /> Date TBC</label
              >
            </div>
            <div class="two">
              <label class="field">Starts <input class="input" type="time" bind:value={date.startTime} /></label>
              <label class="field">Ends <input class="input" type="time" bind:value={date.endTime} /></label>
            </div>
            <label class="field">
              Location
              <input class="input" bind:value={date.location} placeholder={form.location || "e.g. The rink"} />
              <span class="hint small">
                {form.location ? `Leave empty for ${form.location}, the usual place.` : "Where it's held."}
              </span>
            </label>
            <div class="two">
              <label class="field"
                >Places <input class="input num" type="number" min="0" bind:value={date.capacity} /></label
              >
              <label class="field"
                >Fee (£) <input
                  class="input num"
                  inputmode="decimal"
                  bind:value={date.fee}
                  disabled={charged}
                  title={charged ? "Already charged: the fee is fixed" : undefined}
                /></label
              >
            </div>
            <div class="two top">
              <div class="field">
                Status
                <Select
                  id="date-status"
                  bind:value={date.status}
                  options={STATUSES.map((s) => ({ value: s.id, label: s.label }))}
                  aria-label="Status"
                />
              </div>
              <label class="field">
                Sign-up closes
                <input class="input" type="date" bind:value={date.signupClosesOn} max={date.heldOn || undefined} />
                <span class="hint small">The last day to say you're in. Empty: up to the day.</span>
              </label>
            </div>
            <label class="check"><input type="checkbox" bind:checked={date.public} /> Show on the website</label>

            {#if form.draft}
              <h3 class="sub-head">The draft</h3>
              <div class="two">
                <label class="field"
                  >Draft day <input
                    class="input"
                    type="date"
                    bind:value={date.draftOn}
                    max={date.heldOn || undefined}
                  /></label
                >
                <label class="field"
                  >Time <input class="input" type="time" bind:value={date.draftTime} disabled={!date.draftOn} /></label
                >
              </div>
              <div class="field">
                <span>Captains <span class="hint">· in pick order</span></span>
                {#each date.captains as id, i (id)}
                  <div class="captain">
                    <span class="pick num">{i + 1}</span>
                    <span class="grow">{nameOf(id)}</span>
                    <button
                      type="button"
                      class="btn sm ghost icon"
                      aria-label="Pick {nameOf(id)} earlier"
                      disabled={i === 0}
                      onclick={() => moveCaptain(i, -1)}><Icon name="chevronUp" size={16} /></button
                    >
                    <button
                      type="button"
                      class="btn sm ghost icon"
                      aria-label="Pick {nameOf(id)} later"
                      disabled={i === date.captains.length - 1}
                      onclick={() => moveCaptain(i, 1)}><Icon name="chevronDown" size={16} /></button
                    >
                    <button
                      type="button"
                      class="btn sm ghost icon"
                      aria-label="Remove {nameOf(id)}"
                      onclick={() => date?.captains.splice(i, 1)}><Icon name="x" size={16} /></button
                    >
                  </div>
                {/each}
                {#if date.captains.length < 8}
                  <Select
                    id="captain-pick"
                    bind:value={captainPick}
                    onchange={addCaptain}
                    options={[
                      { value: "", label: "Add a captain…", disabled: true },
                      ...members
                        .filter((m) => !date?.captains.includes(m.player.id))
                        .map((m) => ({ value: String(m.player.id), label: m.player.name })),
                    ]}
                    aria-label="Add a captain"
                  />
                {/if}
              </div>
            {/if}

            <button class="btn primary">{date.id ? "Save" : "Schedule it"}</button>
          </form>
        {/if}
      </Sheet>
    {/if}
  {/if}
</div>

<style>
  /* An award: its name, then what it's for (wider), and remove */
  .award {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr) auto;
    gap: var(--s-2);
    align-items: center;
  }
  .add-award {
    justify-self: start;
  }
  @media (max-width: 34rem) {
    .award {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .award > input:nth-child(2) {
      grid-row: 2;
    }
  }
  /* Running and the draft, side by side at the top */
  .checks {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2) var(--s-5);
  }
  /* The form, then the dates under it, spaced like the panel's sections */
  .editor {
    display: grid;
    gap: var(--s-5);
  }
  /* A date's row opens its sheet; the status changes in place */
  .open {
    display: grid;
    gap: 2px;
    min-width: 0;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .open:hover .title {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  /* Status beside Sign-up closes, whose hint runs longer: both start at the top */
  .top {
    align-items: start;
  }
  .tbc {
    align-self: end;
    min-height: var(--control-h);
  }
  .sub-head {
    color: var(--fg);
    font-size: var(--text-md);
    font-weight: 600;
    margin-top: var(--s-2);
  }
  .captain {
    display: flex;
    align-items: center;
    gap: var(--s-2);
  }
  .pick {
    width: 1.5rem;
    color: var(--fg-muted);
  }
  .value {
    color: var(--fg-body);
  }
  /* The section head inside the panel, as the training editor's: a plain heading over a rule */
  .editions-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
    padding-bottom: var(--s-2);
    border-bottom: 1px solid var(--border);
  }
  .editions-head h2 {
    color: var(--fg);
    font-size: var(--text-md);
    font-weight: 600;
  }
  .row :global(.status) {
    flex-shrink: 0;
    width: 9rem;
  }
  /* Narrow: the fee and the status drop under the name, on the right */
  @media (max-width: 600px) {
    .row {
      flex-wrap: wrap;
    }
    .row .grow {
      flex-basis: 100%;
    }
    .row :global(.status) {
      margin-left: auto;
    }
  }
</style>
