<script lang="ts" module>
  import { londonToday } from "./dates";
  /** What the quick form asks: the day and hours, when sign-up opens, the draft's day, the captains in pick order. */
  export interface QuickValues {
    heldOn: string;
    dateConfirmed: boolean;
    startTime: string;
    endTime: string;
    signupOpensOn: string;
    draftOn: string;
    captains: number[];
  }
  /** A new one's answers: its series' usual hours (ADR 0091), sign-up opening today. */
  export const blankQuick = (series?: { defaultStartTime: string; defaultEndTime: string }): QuickValues => ({
    heldOn: "",
    dateConfirmed: true,
    startTime: series?.defaultStartTime ?? "11:00",
    endTime: series?.defaultEndTime ?? "16:00",
    signupOpensOn: londonToday(),
    draftOn: "",
    captains: [],
  });
</script>

<script lang="ts">
  // The next date in a series, as a few questions (ADR 0087): when it is (its day, and its hours, the series' usual
  // ones filled in, ADR 0091), when sign-up opens (ADR 0089), when the draft is, who the captains are. Only the day
  // is needed; the draft's day shows as TBC and the captains as "to be named" until they're set. The rest (place,
  // fee, rules, awards) comes from the series; Advanced opens the full editor with these filled in.
  import TimeSelect from "./TimeSelect.svelte";
  import DateField from "../lib/DateField.svelte";
  import { createTournament } from "../app/backend.svelte";
  import type { Tournament, TournamentType } from "../demo/model";
  import { db } from "../demo/store.svelte";
  import { typePlace } from "../demo/schedule.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import { teamsForPlayoffs } from "./fixtures";
  import PersonPicker from "./PersonPicker.svelte";
  import { goesBy } from "./names";
  import { pounds } from "./dates";

  let {
    type,
    values = $bindable(),
    oncreated,
  }: { type: TournamentType; values: QuickValues; oncreated: (id: number) => void } = $props();

  const draft = $derived(type.kind === "draft");
  const place = $derived(typePlace(type)?.name);
  const members = $derived(
    db.members
      .filter((m) => m.status === "active")
      .map((m) => ({ id: m.player.id, name: goesBy(m.player) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
  const nameOf = (id: number) => members.find((m) => m.id === id)?.name ?? "";
  const taken = $derived(new Set(values.captains));

  async function create(e: SubmitEvent) {
    e.preventDefault();
    const t: Tournament = {
      id: 0,
      typeId: type.id,
      name: type.name,
      // None set: the series' place
      venueId: null,
      location: "",
      mapUrl: "",
      heldOn: values.heldOn,
      season: null,
      startTime: values.startTime,
      endTime: values.endTime,
      capacity: 24,
      status: "planned",
      feePence: type.defaultFeePence,
      dateConfirmed: values.dateConfirmed,
      public: true,
      signupOpensOn: values.signupOpensOn || null,
      signupClosesOn: null,
      draftOn: draft && values.draftOn ? values.draftOn : null,
      pointsWin: type.pointsWin,
      pointsDraw: type.pointsDraw,
      pointsLoss: type.pointsLoss,
      gameMinutes: type.gameMinutes,
      kind: type.kind,
      awards: type.awards.map((a) => ({ ...a })),
      playoffs: (type.playoffs ?? []).map((g) => ({ ...g })),
      teams: values.captains.map((captainMemberId) => ({
        name: "",
        logo: null,
        captainMemberId,
        captainName: "",
        contact: "",
        players: [],
      })),
      going: [],
      waitlist: [],
    };
    const created = await createTournament(t);
    if (created) oncreated(created.id);
  }
</script>

<!-- Submitted from the panel's footer (form="quick-form") -->
<form class="quick" id="quick-form" onsubmit={create}>
  <section class="q">
    <h3 class="q-title"><span class="n num">1</span>When is it?</h3>
    <div class="fields">
      <div class="field">
        Day <DateField
          id="quick-day"
          aria-label="Day"
          required
          min={londonToday()}
          bind:value={values.heldOn}
          aria-describedby="quick-day-hint"
        />
      </div>
      <label class="check tbc"
        ><input
          type="checkbox"
          checked={!values.dateConfirmed}
          onchange={(e) => (values.dateConfirmed = !e.currentTarget.checked)}
        /> Not fixed yet (TBC)</label
      >
    </div>
    <div class="fields">
      <div class="field time">
        Starts <TimeSelect id="quick-start" bind:value={values.startTime} aria-label="Starts" />
      </div>
      <div class="field time">Ends <TimeSelect id="quick-end" bind:value={values.endTime} aria-label="Ends" /></div>
    </div>
    <p class="hint" id="quick-day-hint">
      The {type.shortName}'s usual hours{place ? `, at ${place}` : ""}{type.defaultFeePence
        ? ` · ${pounds(type.defaultFeePence)}`
        : ""}. Change them for this one here, or the usual ones in the series' settings.
    </p>
  </section>

  <section class="q">
    <h3 class="q-title"><span class="n num">2</span>When does sign-up open?</h3>
    <div class="fields">
      <div class="field">
        Day <DateField
          id="quick-signup"
          aria-label="Sign-up opens"
          required
          max={values.heldOn || undefined}
          bind:value={values.signupOpensOn}
        />
      </div>
    </div>
    <p class="hint">Members can say they're in from then. Today, unless you'd rather wait.</p>
  </section>

  {#if draft}
    <section class="q">
      <h3 class="q-title"><span class="n num">3</span>When's the draft? <span class="opt">· optional</span></h3>
      <div class="fields">
        <div class="field">
          Day <DateField
            id="quick-draft"
            aria-label="Draft day"
            placeholder="TBC"
            min={londonToday()}
            max={values.heldOn || undefined}
            bind:value={values.draftOn}
          />
        </div>
      </div>
      <p class="hint">
        A reminder for the captains; you tell them when it opens. Not set yet? Leave it: it shows as TBC.
      </p>
    </section>

    <section class="q">
      <h3 class="q-title"><span class="n num">4</span>Who are the captains? <span class="opt">· optional</span></h3>
      {#if values.captains.length}
        <ol class="captains">
          {#each values.captains as id, i (id)}
            <li>
              <span class="pick num">{i + 1}</span>
              <span class="name">{nameOf(id)}</span>
              <button
                type="button"
                class="btn ghost sm icon"
                aria-label="Take {nameOf(id)} off"
                onclick={() => values.captains.splice(i, 1)}><Icon name="x" size={16} /></button
              >
            </li>
          {/each}
        </ol>
      {/if}
      <PersonPicker
        id="quick-captain"
        {members}
        exclude={taken}
        clearOnPick
        placeholder="Add a captain: type a name…"
        aria-label="Add a captain"
        onpick={(id) => values.captains.push(id)}
      />
      {#if values.captains.length && values.captains.length < teamsForPlayoffs(type.playoffs ?? [])}
        <p class="hint warn">
          <Icon name="alert" size={16} />The {type.shortName}'s playoffs need {teamsForPlayoffs(type.playoffs ?? [])}
          teams: add more captains, or choose fewer playoffs under Advanced.
        </p>
      {/if}
      <p class="hint">In pick order: the first picks first. They can be named later.</p>
    </section>
  {/if}
</form>

<style>
  /* The questions, one under another, numbered: answered top to bottom */
  .quick {
    display: grid;
    gap: var(--s-8);
  }
  .q {
    display: grid;
    gap: var(--s-3);
  }
  .q-title {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    margin: 0;
    color: var(--fg);
    font-size: var(--text-md);
    font-weight: 600;
  }
  .q-title .n {
    display: grid;
    place-items: center;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: var(--r-pill);
    background: var(--surface-3);
    color: var(--fg);
    font-size: var(--text-xs);
    font-weight: 700;
  }
  .opt {
    color: var(--fg-muted);
    font-weight: 400;
  }
  .fields {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--s-3) var(--s-4);
  }
  .fields .field {
    flex: 0 1 12rem;
  }
  .fields .field.time {
    flex-basis: 8rem;
  }
  .tbc {
    gap: var(--s-2);
    min-height: var(--control-h);
    font-size: var(--text-sm);
  }
  .tbc input {
    width: 1rem;
    height: 1rem;
  }
  .hint {
    margin: 0;
  }
  .captains {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .captains li {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    min-height: 2.5rem;
    border-bottom: 1px solid var(--border);
  }
  .pick {
    width: 1.5rem;
    color: var(--fg-subtle);
    font-weight: 600;
    text-align: center;
  }
  .name {
    flex: 1;
    min-width: 0;
    color: var(--fg);
    font-weight: 500;
  }
</style>
