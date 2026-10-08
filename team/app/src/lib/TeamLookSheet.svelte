<script lang="ts">
  // A team's name and logo, in a sheet over the page (its captain or an admin, ADR 0065). No logo: its initials.
  import Sheet from "./Sheet.svelte";
  import TeamCrest from "./TeamCrest.svelte";
  import { shrinkLogo } from "./logo";
  import { setTeamLook } from "../app/backend.svelte";

  let {
    tournamentId,
    teamId,
    name,
    logo,
    fallback,
    open = $bindable(false),
  }: {
    tournamentId: number;
    teamId: number;
    name: string;
    logo: string | null;
    /** What it's called with no name of its own: "Team Dan". */
    fallback: string;
    open?: boolean;
  } = $props();

  // svelte-ignore state_referenced_locally
  let form = $state({ name, logo });
  let error = $state("");
  let file = $state<HTMLInputElement | undefined>();

  async function pick(f: File | undefined) {
    error = "";
    if (!f) return;
    try {
      form.logo = await shrinkLogo(f);
    } catch {
      error = "That image couldn't be read. Try a PNG or JPEG.";
    }
  }
  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (await setTeamLook(tournamentId, teamId, form.name.trim(), form.logo)) open = false;
  }
</script>

<Sheet bind:open title="The team's look">
  <form id="team-look" class="form" onsubmit={save}>
    <div class="look">
      <TeamCrest name={form.name.trim() || fallback} logo={form.logo} size="4.5rem" onclick={() => file?.click()} />
      <div class="run">
        <button type="button" class="btn sm outline" onclick={() => file?.click()}
          >{form.logo ? "Change the logo" : "Add a logo"}</button
        >
        {#if form.logo}
          <button type="button" class="btn sm ghost" onclick={() => (form.logo = null)}>Use the initials</button>
        {/if}
      </div>
      <input
        class="file"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        bind:this={file}
        onchange={(e) => pick(e.currentTarget.files?.[0])}
      />
    </div>
    {#if error}<p class="error small">{error}</p>{/if}
    <label class="field">
      <span>Name <span class="hint">· optional</span></span>
      <input class="input" maxlength="40" placeholder={fallback} bind:value={form.name} />
    </label>
  </form>
  {#snippet footer()}
    <button class="btn primary" type="submit" form="team-look">Save</button>
  {/snippet}
</Sheet>

<style>
  .look {
    display: flex;
    align-items: center;
    gap: var(--s-4);
  }
  .run {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
  }
  .file {
    display: none;
  }
</style>
