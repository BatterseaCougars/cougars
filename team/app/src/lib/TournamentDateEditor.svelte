<script lang="ts" module>
  import { goesBy } from "./names";
  import type { TournamentStatus } from "../demo/model";

  export const STATUSES: { id: TournamentStatus; label: string }[] = [
    { id: "planned", label: "Coming up" },
    { id: "open", label: "Sign-up open" },
    { id: "live", label: "Live" },
    { id: "finished", label: "Finished" },
  ];
</script>

<script lang="ts">
  // One tournament's editor, in the panel its card opens (Settings → Tournaments): what an admin comes here
  // for. When and where it is, its rules and awards, sign-up, and its teams (ADR 0052): teams that entered, or a
  // draft's captains in pick order and the draft night, on tabs as the training editor lays out its fields. Picking a series copies its defaults in (ADR 0049); they can
  // then change for this one. The series' look (icon, colour) stays the series'.
  import { tick } from "svelte";
  import { createTournament, updateTournament } from "../app/backend.svelte";
  import {
    TOURNAMENT_KINDS,
    type Playoff,
    type Tournament,
    type TournamentKind,
    type TournamentTeam,
  } from "../demo/model";
  import { db } from "../demo/store.svelte";
  import { collectedFor } from "../demo/dues.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import Select from "./Select.svelte";
  import FormSection from "./FormSection.svelte";
  import PlacePicker from "./PlacePicker.svelte";
  import PersonPicker from "./PersonPicker.svelte";
  import PlayoffsField from "./PlayoffsField.svelte";
  import TeamCard from "./TeamCard.svelte";
  import { typePlace } from "../demo/schedule.svelte";
  import { londonToday, pounds } from "./dates";
  import { navigate } from "../app/router.svelte";
  import { seriesToOpen } from "../pages/TournamentSeries.svelte";
  import { SEASONS, seasonEnd, seasonOf, seasonYear, type Season } from "../../../../shared/seasons";

  let {
    dateId,
    typeId,
    startTab = "details",
    oncreated,
  }: {
    dateId?: number;
    /** A new date in this series, its defaults copied in (from the series' own page) */
    typeId?: number;
    /** The tab it opens on: "teams" to add the captains */
    startTab?: "details" | "rules" | "signup" | "teams";
    oncreated?: (id: number) => void;
  } = $props();

  interface DateForm {
    id: number;
    /** Its series, or none: a tournament can stand on its own */
    typeId: number | null;
    name: string;
    /** Optional: empty while it's just a season (ADR 0048) */
    heldOn: string;
    dateConfirmed: boolean;
    /** Always: the season it's in, which a day sets */
    season: Season;
    seasonYear: number;
    startTime: string;
    endTime: string;
    /** Its place (ADR 0051); none set: its series' */
    venueId: number | null;
    location: string;
    mapUrl: string;
    capacity: number | null;
    fee: string;
    status: TournamentStatus;
    public: boolean;
    signupClosesOn: string;
    draftOn: string;
    draftTime: string;
    pointsWin: number;
    pointsDraw: number;
    pointsLoss: number;
    gameMinutes: number;
    kind: TournamentKind;
    awards: { name: string; about: string }[];
    playoffs: Playoff[];
    teams: TournamentTeam[];
  }
  const MAX_AWARDS = 8;

  // A new date's season: next summer, unless this one is still to come
  const thisYear = Number(londonToday().slice(0, 4));
  const nextSummer = londonToday() <= seasonEnd("summer", thisYear) ? thisYear : thisYear + 1;
  const YEARS = [0, 1, 2, 3].map((n) => thisYear + n);

  function formOf(t: Tournament | undefined): DateForm {
    if (t)
      return {
        id: t.id,
        typeId: t.typeId,
        name: t.name,
        // A season's day is only its stand-in, never shown
        heldOn: t.season ? "" : t.heldOn,
        dateConfirmed: t.season ? true : t.dateConfirmed,
        season: t.season ?? seasonOf(t.heldOn).season,
        seasonYear: t.season ? seasonYear(t.season, t.heldOn) : seasonOf(t.heldOn).year,
        startTime: t.startTime,
        endTime: t.endTime,
        venueId: t.venueId,
        location: t.location,
        mapUrl: t.mapUrl,
        capacity: t.capacity,
        fee: String(t.feePence / 100),
        status: t.status,
        public: t.public,
        signupClosesOn: t.signupClosesOn ?? "",
        draftOn: t.draftOn ?? "",
        draftTime: t.draftTime ?? "",
        pointsWin: t.pointsWin,
        pointsDraw: t.pointsDraw,
        pointsLoss: t.pointsLoss,
        gameMinutes: t.gameMinutes,
        kind: t.kind,
        awards: t.awards.map((a) => ({ ...a })),
        playoffs: (t.playoffs ?? []).map((g) => ({ ...g })),
        teams: t.teams.map((team) => ({ ...team, players: team.players.map((p) => ({ ...p })) })),
      };
    // A new one stands on its own until a series is picked
    return {
      id: 0,
      typeId: null,
      name: "",
      heldOn: "",
      dateConfirmed: true,
      season: "summer",
      seasonYear: nextSummer,
      startTime: "11:00",
      endTime: "16:00",
      venueId: null,
      location: "",
      mapUrl: "",
      capacity: 24,
      fee: "0",
      status: "planned",
      public: true,
      signupClosesOn: "",
      draftOn: "",
      draftTime: "19:00",
      // The usual round robin until a series says otherwise
      pointsWin: 3,
      pointsDraw: 1,
      pointsLoss: 0,
      gameMinutes: 12,
      kind: "teams",
      awards: [],
      playoffs: [],
      teams: [],
    };
  }

  // The panel mounts a fresh editor for each date, so the form takes its starting values once
  const starting = () => {
    const t = dateId ? db.tournaments.find((x) => x.id === dateId) : undefined;
    return formOf(t ? $state.snapshot(t) : undefined);
  };
  let date = $state<DateForm>(starting());

  const type = $derived(db.tournamentTypes.find((t) => t.id === date.typeId));
  /** Already charged: the fee is fixed. */
  const charged = $derived(date.id ? collectedFor("tournament", date.id).people > 0 : false);
  const collected = $derived(date.id ? collectedFor("tournament", date.id) : null);

  /**
   * Picking a series copies its defaults in: its rules, awards and location, its name if there's none yet, and its
   * fee unless anyone's paid. They can then change for this one.
   */
  function pickType(id: string) {
    date.typeId = id ? Number(id) : null;
    const t = db.tournamentTypes.find((x) => x.id === date.typeId);
    if (!t) return;
    if (!date.name) date.name = t.name;
    if (!charged) date.fee = String(t.defaultFeePence / 100);
    date.venueId = t.venueId;
    date.location = t.location;
    date.mapUrl = t.mapUrl;
    date.pointsWin = t.pointsWin;
    date.pointsDraw = t.pointsDraw;
    date.pointsLoss = t.pointsLoss;
    date.gameMinutes = t.gameMinutes;
    date.kind = t.kind;
    date.awards = t.awards.map((a) => ({ ...a }));
    date.playoffs = (t.playoffs ?? []).map((g) => ({ ...g }));
  }

  // Started from a series' page: in that series from the off (the panel mounts a fresh editor for each, as above)
  // svelte-ignore state_referenced_locally
  if (!dateId && typeId) pickType(String(typeId));

  /** Off to the series' own page, its defaults open. */
  function editSeries() {
    if (!type) return;
    seriesToOpen.id = type.id;
    navigate("/settings/tournament-series");
  }
  // The running series, and this one's even if it's paused
  const seriesOptions = $derived([
    { value: "", label: "No series" },
    ...db.tournamentTypes
      .filter((t) => t.active || t.id === date.typeId)
      .map((t) => ({ value: String(t.id), label: t.name })),
  ]);

  /** The day a date sorts by: its own, or its season's last. */
  const dayOf = (d: DateForm) => d.heldOn || seasonEnd(d.season, d.seasonYear);

  // A day sets the season it's in; a season the day isn't in clears the day
  function pickDay(day: string) {
    date.heldOn = day;
    if (day) ({ season: date.season, year: date.seasonYear } = seasonOf(day));
  }
  function pickSeason(season: Season, year: number) {
    date.season = season;
    date.seasonYear = year;
    if (date.heldOn) {
      const s = seasonOf(date.heldOn);
      if (s.season !== season || s.year !== year) date.heldOn = "";
    }
  }
  const yearOptions = $derived(
    [...new Set([date.seasonYear, ...YEARS])].sort().map((y) => ({ value: String(y), label: String(y) })),
  );

  const members = $derived(
    db.members.filter((m) => m.status === "active").sort((a, b) => goesBy(a.player).localeCompare(goesBy(b.player))),
  );
  const memberList = $derived(members.map((m) => ({ id: m.player.id, name: goesBy(m.player) })));

  // Teams (ADR 0052): nobody on two of them; a draft's are in pick order
  const MAX_TEAMS = 16;
  const taken = $derived(
    new Set(
      date.teams.flatMap((t) => [t.captainMemberId, ...t.players.map((p) => p.memberId)]).filter((m) => m !== null),
    ),
  );
  function addTeam() {
    date.teams.push({ name: "", logo: null, captainMemberId: null, captainName: "", contact: "", players: [] });
  }
  function addCaptain(memberId: number) {
    date.teams.push({ name: "", logo: null, captainMemberId: memberId, captainName: "", contact: "", players: [] });
  }
  function moveTeam(i: number, by: -1 | 1) {
    const [t] = date.teams.splice(i, 1);
    date.teams.splice(i + by, 0, t);
  }

  // Four tabs: the tournament itself, how it's played, sign-up, then its teams (and a draft's night)
  type Tab = "details" | "rules" | "signup" | "teams";
  // svelte-ignore state_referenced_locally
  let tab = $state<Tab>(startTab);
  const tabs = $derived<{ id: Tab; label: string }[]>([
    { id: "details", label: "Details" },
    { id: "rules", label: "Rules & awards" },
    { id: "signup", label: "Sign-up" },
    { id: "teams", label: date.kind === "draft" ? "Draft & teams" : "Teams" },
  ]);
  let formEl = $state<HTMLFormElement | undefined>();

  /** Save from another tab with something missing: go to its tab and say what. */
  async function showMissing(on: Tab) {
    tab = on;
    await tick();
    formEl?.reportValidity();
  }

  const toTournament = (d: DateForm): Tournament => ({
    id: d.id,
    typeId: d.typeId,
    name: d.name,
    venueId: d.venueId,
    location: d.venueId ? "" : d.location.trim(),
    mapUrl: d.venueId ? "" : d.mapUrl.trim(),
    heldOn: dayOf(d),
    season: d.heldOn ? null : d.season,
    startTime: d.startTime,
    endTime: d.endTime,
    capacity: d.capacity || null,
    status: d.status,
    feePence: Math.round(Number(d.fee || 0) * 100),
    dateConfirmed: !!d.heldOn && d.dateConfirmed,
    public: d.public,
    signupClosesOn: d.signupClosesOn || null,
    draftOn: d.kind === "draft" && d.draftOn ? d.draftOn : null,
    draftTime: d.kind === "draft" && d.draftOn && d.draftTime ? d.draftTime : null,
    pointsWin: d.pointsWin,
    pointsDraw: d.pointsDraw,
    pointsLoss: d.pointsLoss,
    gameMinutes: d.gameMinutes,
    kind: d.kind,
    awards: d.awards.filter((a) => a.name.trim()),
    playoffs: d.playoffs.filter((g) => g.name.trim()),
    teams: d.teams,
    going: [],
    waitlist: [],
  });

  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (!date.name) return showMissing("details");
    if (date.kind === "teams" && date.teams.some((t) => !t.name.trim())) return showMissing("teams");
    const t = toTournament(date);
    if (date.id) return void (await updateTournament(t));
    const created = await createTournament(t);
    // The blank form gives way to the new date's editor, in the same panel
    if (created) oncreated?.(created.id);
  }
</script>

<div class="editor">
  <div class="seg tabs" role="tablist" aria-label="Tournament date">
    {#each tabs as t (t.id)}
      <button
        type="button"
        role="tab"
        id="date-tab-{t.id}"
        aria-selected={tab === t.id}
        aria-controls="date-panel"
        onclick={() => (tab = t.id)}
      >
        {t.label}
      </button>
    {/each}
  </div>
  <!-- Saved from the panel's footer (form="date-form"), whichever tab is showing -->
  <form class="form" id="date-form" onsubmit={save} bind:this={formEl}>
    {#key tab}
      <div class="panel-tab rise" id="date-panel" role="tabpanel" aria-labelledby="date-tab-{tab}">
        {#if tab === "details"}
          <FormSection title="What">
            <div class="field">
              <span>Series <span class="hint">· optional</span></span>
              <Select
                id="date-type"
                value={date.typeId ? String(date.typeId) : ""}
                onchange={pickType}
                options={seriesOptions}
                aria-label="Series"
              />
              <span class="hint small">
                {#if type}
                  Its fee, location, rules and awards were copied from the series; change them here for this one.
                  <button type="button" class="link" onclick={editSeries}>Edit the series' defaults</button>
                {:else}
                  One on its own, or pick a series to copy in its rules, awards, location and fee.
                {/if}
              </span>
            </div>
            <label class="field"
              >Name <input
                class="input"
                bind:value={date.name}
                placeholder="e.g. Winter {type?.shortName ?? 'Cup'}"
                required
              /></label
            >
            <div class="field">
              <span id="date-kind">Type</span>
              <div class="seg kind" role="group" aria-labelledby="date-kind">
                {#each TOURNAMENT_KINDS as k (k.id)}
                  <button type="button" aria-pressed={date.kind === k.id} onclick={() => (date.kind = k.id)}>
                    {k.label}
                  </button>
                {/each}
              </div>
              <span class="hint small">{TOURNAMENT_KINDS.find((k) => k.id === date.kind)?.hint}</span>
            </div>
          </FormSection>
          <FormSection title="When" description="A season is enough until the day is known.">
            <div class="cols">
              <div class="field">
                Season
                <Select
                  id="date-season"
                  value={date.season}
                  onchange={(v) => pickSeason(v, date.seasonYear)}
                  options={SEASONS.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
                  aria-label="Season"
                />
              </div>
              <div class="field">
                Year
                <Select
                  id="date-year"
                  value={String(date.seasonYear)}
                  onchange={(v) => pickSeason(date.season, Number(v))}
                  options={yearOptions}
                  aria-label="Year"
                />
              </div>
              <!-- The day, once it's known; TBC at the end of its label, for a day that isn't fixed yet -->
              <div class="field">
                <div class="label-row">
                  <label for="date-day">Date <span class="hint">· optional</span></label>
                  <label class="check tbc"
                    ><input
                      type="checkbox"
                      disabled={!date.heldOn}
                      checked={!!date.heldOn && !date.dateConfirmed}
                      onchange={(e) => (date.dateConfirmed = !e.currentTarget.checked)}
                    /> TBC</label
                  >
                </div>
                <input
                  id="date-day"
                  class="input"
                  type="date"
                  value={date.heldOn}
                  onchange={(e) => pickDay(e.currentTarget.value)}
                />
              </div>
              <label class="field">Starts <input class="input" type="time" bind:value={date.startTime} /></label>
              <label class="field">Ends <input class="input" type="time" bind:value={date.endTime} /></label>
            </div>
          </FormSection>
          <FormSection title="Where">
            <PlacePicker
              id="date-place"
              bind:venueId={date.venueId}
              bind:name={date.location}
              bind:mapUrl={date.mapUrl}
              usual={type ? typePlace(type) : undefined}
            />
          </FormSection>
        {:else if tab === "rules"}
          <FormSection title="Rules" description="Round robin: every team plays every other once.">
            <div class="cols">
              <label class="field"
                >Points for a win <input class="input num" type="number" min="0" bind:value={date.pointsWin} /></label
              >
              <label class="field"
                >A draw <input class="input num" type="number" min="0" bind:value={date.pointsDraw} /></label
              >
              <label class="field"
                >A loss <input class="input num" type="number" min="0" bind:value={date.pointsLoss} /></label
              >
              <label class="field">
                Game length (minutes)
                <input class="input num" type="number" min="1" max="90" bind:value={date.gameMinutes} />
              </label>
            </div>
          </FormSection>
          <FormSection title="Playoffs" description="After the round robin, by place in the table.">
            <PlayoffsField bind:playoffs={date.playoffs} />
          </FormSection>
          <FormSection title="Awards" description="Handed out on the day, and shown on the website.">
            {#each date.awards as award, i (i)}
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
                  onclick={() => date.awards.splice(i, 1)}
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            {/each}
            {#if date.awards.length < MAX_AWARDS}
              <button type="button" class="btn sm add-award" onclick={() => date.awards.push({ name: "", about: "" })}>
                <Icon name="plus" size={16} />Award
              </button>
            {/if}
          </FormSection>
        {:else if tab === "signup"}
          <FormSection
            title="Sign-up"
            description="Members say they're in while it's Sign-up open, until sign-up closes (empty: up to the day)."
          >
            <div class="cols">
              <div class="field">
                Status
                <Select
                  id="date-status"
                  bind:value={date.status}
                  options={STATUSES.map((s) => ({ value: s.id, label: s.label }))}
                  aria-label="Status"
                />
              </div>
              <div class="field">
                Website
                <Select
                  id="date-public"
                  value={date.public ? "yes" : "no"}
                  onchange={(v) => (date.public = v === "yes")}
                  options={[
                    { value: "yes", label: "On the website" },
                    { value: "no", label: "Members only" },
                  ]}
                  aria-label="Website"
                />
              </div>
              <label class="field">
                Sign-up closes
                <input class="input" type="date" bind:value={date.signupClosesOn} max={dayOf(date) || undefined} />
              </label>
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
            {#if collected?.people}
              <p class="num">Collected {pounds(collected.paid)} of {pounds(collected.due)}</p>
            {/if}
          </FormSection>
        {:else}
          {#if date.kind === "draft"}
            <FormSection title="Draft" description="Captains pick members in snake order, on the Draft page.">
              <div class="cols">
                <label class="field"
                  >Draft day <input
                    class="input"
                    type="date"
                    bind:value={date.draftOn}
                    max={dayOf(date) || undefined}
                  /></label
                >
                <label class="field"
                  >Time <input class="input" type="time" bind:value={date.draftTime} disabled={!date.draftOn} /></label
                >
              </div>
            </FormSection>
          {/if}
          <FormSection
            title={date.kind === "draft" ? "Captains" : "Teams"}
            description={date.kind === "draft"
              ? "The captains, in pick order. Their players come from the draft."
              : "Each team that's entered: its name, logo, captain and players."}
          >
            <div class="teams" class:draft={date.kind === "draft"}>
              {#each date.teams as _, i (i)}
                <TeamCard
                  bind:team={date.teams[i]}
                  kind={date.kind}
                  pick={i + 1}
                  members={memberList}
                  {taken}
                  onmove={{
                    up: i > 0 ? () => moveTeam(i, -1) : undefined,
                    down: i < date.teams.length - 1 ? () => moveTeam(i, 1) : undefined,
                  }}
                  onremove={() => date.teams.splice(i, 1)}
                />
              {:else}
                {#if date.kind !== "draft"}<p class="hint">No teams yet.</p>{/if}
              {/each}
            </div>
            {#if date.teams.length < MAX_TEAMS}
              {#if date.kind === "draft"}
                <!-- The next pick's slot: find a member and they're its captain -->
                <div class="add-captain">
                  <span class="next num" aria-hidden="true">{date.teams.length + 1}</span>
                  <span class="slot" aria-hidden="true"><Icon name="plus" size={16} /></span>
                  <PersonPicker
                    id="add-captain"
                    members={memberList}
                    exclude={taken}
                    clearOnPick
                    placeholder="Add a captain: type a name…"
                    aria-label="Add a captain"
                    onpick={addCaptain}
                  />
                </div>
              {:else}
                <button type="button" class="btn sm add-award" onclick={addTeam}>
                  <Icon name="plus" size={16} />Team
                </button>
              {/if}
            {/if}
          </FormSection>
        {/if}
      </div>
    {/key}
  </form>
</div>

<style>
  /* The tabs, then the tab showing. Its grid answers to the panel's width, not the screen's */
  .editor {
    display: grid;
    gap: var(--s-5);
    container-type: inline-size;
  }
  .tabs {
    justify-self: start;
  }
  .tabs > button {
    flex: none;
    min-width: 6.5rem;
  }
  /* Fields three to a row, wrapping on, so every field lines up with the ones above it */
  .cols {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--s-5) var(--s-4);
    align-items: start;
  }
  @container (max-width: 30rem) {
    .cols {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  /* A field's label with TBC at the end of the column, the row no taller than a plain label */
  .label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
    height: 1.25rem;
  }
  .tbc {
    gap: var(--s-2);
    font-size: var(--text-sm);
  }
  .tbc input {
    width: 1rem;
    height: 1rem;
  }
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
  @container (max-width: 34rem) {
    .award {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .award > input:nth-child(2) {
      grid-row: 2;
    }
  }
  .link {
    padding: 0;
    border: 0;
    background: none;
    color: var(--fg);
    font: inherit;
    text-decoration: underline;
    text-underline-offset: 0.2em;
    cursor: pointer;
  }
  .kind {
    justify-self: start;
  }
  .teams {
    display: grid;
    gap: var(--s-3);
  }
  .teams.draft {
    gap: var(--s-2);
  }
  /* Lines up with the captains above: pick number, logo square, then the search */
  .add-captain {
    display: grid;
    grid-template-columns: 1.5rem var(--control-h) minmax(0, 22rem);
    gap: var(--s-2);
    align-items: center;
  }
  .add-captain .next {
    color: var(--fg-subtle);
    font-weight: 600;
    text-align: center;
  }
  .add-captain .slot {
    display: grid;
    place-items: center;
    height: var(--control-h);
    border: 1px dashed var(--border-strong);
    border-radius: var(--r-md);
    color: var(--fg-subtle);
  }
</style>
