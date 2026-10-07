<script lang="ts">
  // One team in a tournament's editor (ADR 0052): its logo, name and captain, then its players. In a draft the
  // captain is a member and the team's place is its pick order; a team that entered may be from outside the club, so
  // its captain and players can be just names, with a way to reach the captain.
  import type { TournamentKind, TournamentTeam } from "../demo/model";
  import Icon from "../app/shell/Icon.svelte";
  import Select from "./Select.svelte";

  let {
    team = $bindable(),
    kind,
    pick,
    members,
    taken,
    onmove,
    onremove,
  }: {
    team: TournamentTeam;
    kind: TournamentKind;
    /** Its place in the draft's pick order, from 1. */
    pick: number;
    members: { id: number; name: string }[];
    /** Members already on a team (this one's included), who can't be added again. */
    taken: Set<number>;
    /** Earlier (-1) or later (1) in the pick order; absent where it can't move that way. */
    onmove?: (by: -1 | 1) => void;
    onremove: () => void;
  } = $props();

  const nameOf = (id: number | null) => members.find((m) => m.id === id)?.name ?? "";
  const label = $derived(team.name || nameOf(team.captainMemberId) || team.captainName || "New team");
  const initials = $derived(
    label
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
  );
  const free = $derived(members.filter((m) => !taken.has(m.id)));

  // A logo: shrunk in the browser to 256px on its longest side, so it's small enough to keep in the database
  let fileInput = $state<HTMLInputElement | undefined>();
  let logoError = $state("");
  async function pickLogo(file: File | undefined) {
    logoError = "";
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const webp = canvas.toDataURL("image/webp", 0.85);
      team.logo = webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
    } catch {
      logoError = "That image couldn't be read. Try a PNG or JPEG.";
    }
  }

  function pickCaptain(id: string) {
    team.captainMemberId = id ? Number(id) : null;
    if (team.captainMemberId) team.captainName = "";
  }

  let playerPick = $state("");
  let playerName = $state("");
  function addMember(id: string) {
    if (id) team.players.push({ memberId: Number(id), name: "" });
    playerPick = "";
  }
  function addName() {
    const name = playerName.trim();
    if (name) team.players.push({ memberId: null, name });
    playerName = "";
  }
</script>

<article class="team">
  <header class="head">
    {#if kind === "draft"}<span class="pick num" title="Pick order">{pick}</span>{/if}
    <button
      type="button"
      class="logo"
      aria-label={team.logo ? `Change ${label}'s logo` : `Add a logo for ${label}`}
      onclick={() => fileInput?.click()}
    >
      {#if team.logo}<img src={team.logo} alt="" />{:else}<span>{initials}</span>{/if}
    </button>
    <input
      bind:this={fileInput}
      class="file"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      tabindex="-1"
      onchange={(e) => pickLogo(e.currentTarget.files?.[0])}
    />
    <label class="field grow">
      <span
        >Team name {#if kind === "draft"}<span class="hint">· optional</span>{/if}</span
      >
      <input
        class="input"
        bind:value={team.name}
        placeholder={kind === "draft" ? "e.g. Team Red" : "e.g. Clapham Crushers"}
        maxlength="40"
        required={kind === "teams"}
      />
    </label>
    <div class="actions">
      {#if kind === "draft"}
        <button
          type="button"
          class="btn sm ghost icon"
          aria-label="Pick earlier"
          disabled={!onmove}
          onclick={() => onmove?.(-1)}><Icon name="chevronUp" size={16} /></button
        >
      {/if}
      {#if team.logo}
        <button type="button" class="btn sm ghost" onclick={() => (team.logo = null)}>Remove logo</button>
      {/if}
      <button type="button" class="btn sm ghost icon" aria-label="Remove {label}" onclick={onremove}>
        <Icon name="x" size={16} />
      </button>
    </div>
  </header>
  {#if logoError}<p class="error small">{logoError}</p>{/if}

  <div class="cols">
    <div class="field">
      Captain
      <Select
        id="captain-{pick}"
        value={team.captainMemberId ? String(team.captainMemberId) : ""}
        onchange={pickCaptain}
        options={[
          { value: "", label: kind === "draft" ? "Pick a member…" : "Not a member", disabled: kind === "draft" },
          ...members
            .filter((m) => !taken.has(m.id) || m.id === team.captainMemberId)
            .map((m) => ({ value: String(m.id), label: m.name })),
        ]}
        aria-label="Captain"
      />
    </div>
    {#if kind === "teams" && !team.captainMemberId}
      <label class="field">Captain's name <input class="input" bind:value={team.captainName} maxlength="60" /></label>
      <label class="field"
        >How to reach them <input
          class="input"
          bind:value={team.contact}
          placeholder="Email or phone"
          maxlength="120"
        /></label
      >
    {/if}
  </div>

  <div class="field">
    <span
      >Players <span class="hint">· {team.players.length}{kind === "draft" ? ", in the order picked" : ""}</span></span
    >
    {#if team.players.length}
      <ol class="players">
        {#each team.players as p, i (i)}
          <li>
            <span class="grow">{p.memberId ? nameOf(p.memberId) : p.name}</span>
            {#if !p.memberId}<span class="hint small">not a member</span>{/if}
            <button
              type="button"
              class="btn sm ghost icon"
              aria-label="Remove {p.memberId ? nameOf(p.memberId) : p.name}"
              onclick={() => team.players.splice(i, 1)}><Icon name="x" size={14} /></button
            >
          </li>
        {/each}
      </ol>
    {/if}
    {#if team.players.length < 30}
      <div class="add">
        <Select
          id="player-pick-{pick}"
          bind:value={playerPick}
          onchange={addMember}
          options={[
            { value: "", label: "Add a member…", disabled: true },
            ...free.map((m) => ({ value: String(m.id), label: m.name })),
          ]}
          aria-label="Add a member"
        />
        {#if kind === "teams"}
          <input
            class="input"
            bind:value={playerName}
            placeholder="or someone from outside"
            maxlength="60"
            aria-label="A player from outside the club"
            onkeydown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addName();
              }
            }}
          />
          <button type="button" class="btn sm" disabled={!playerName.trim()} onclick={addName}>Add</button>
        {/if}
      </div>
    {/if}
  </div>
</article>

<style>
  .team {
    display: grid;
    gap: var(--s-4);
    padding: var(--s-4);
    border-radius: var(--r-lg);
    background: var(--surface-2);
  }
  .head {
    display: flex;
    align-items: end;
    gap: var(--s-3);
  }
  .pick {
    align-self: center;
    width: 1.5rem;
    color: var(--fg-muted);
    font-weight: 600;
    text-align: center;
  }
  /* The logo, or its initials: a square the height of the name's box */
  .logo {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: var(--control-h);
    height: var(--control-h);
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: var(--r-md);
    background: var(--field-bg);
    color: var(--fg-muted);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
  }
  .logo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .file {
    display: none;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: var(--s-1);
    min-height: var(--control-h);
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--s-4);
    align-items: start;
  }
  @container (max-width: 30rem) {
    .cols {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .players {
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: player;
  }
  .players li {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    color: var(--fg-body);
    counter-increment: player;
  }
  .players li::before {
    content: counter(player);
    width: 1.5rem;
    color: var(--fg-subtle);
    font-size: var(--text-xs);
  }
  .add {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
    gap: var(--s-2);
    align-items: center;
  }
  .add:has(> :only-child) {
    grid-template-columns: minmax(0, 1fr);
  }
  .error {
    color: var(--red-hot);
  }
</style>
