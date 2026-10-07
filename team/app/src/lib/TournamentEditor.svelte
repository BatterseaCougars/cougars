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
    awards: [
      { name: "Champions", about: "The team on top of the table at the end of the day." },
      { name: "Top scorer", about: "Most goals across every game." },
    ],
  });
  const MAX_AWARDS = 8;

  $effect(() => {
    const t = selected === "new" ? blank() : db.tournamentTypes.find((x) => x.id === selected);
    form = t ? structuredClone($state.snapshot(t)) : null;
    adding = false;
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
      dateConfirmed: true,
      going: [],
      waitlist: [],
    };
    if (!(await createTournament(t))) return;
    adding = false;
    edition = { name: "", heldOn: "", startTime: "11:00", endTime: "16:00", location: "", capacity: 24, fee: "" };
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
        <button class="btn sm" class:primary={!adding} class:ghost={adding} onclick={startAdding}>
          {#if adding}Cancel{:else}<Icon name="plus" size={16} />Date{/if}
        </button>
      </div>

      {#if adding}
        <form class="form" onsubmit={addEdition}>
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
              <span class="sub">{[whenOf(t), t.location].filter(Boolean).join(" · ")}</span>
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
  .fee input {
    width: 4.5rem;
    height: var(--control-h-sm);
    padding: 0 var(--s-2);
    text-align: right;
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
    .fee {
      margin-left: auto;
    }
  }
</style>
