<script lang="ts">
  // An admin adds someone to the club, in a sheet over Teammates (ADR 0065, 0069): name, email, position. They're in
  // straight away, and the app emails them a link to itself; they sign in with that email.
  import Sheet from "./Sheet.svelte";
  import { POSITIONS, type Position } from "../demo/data";
  import { addMember } from "../app/backend.svelte";

  let { open = $bindable(false) }: { open?: boolean } = $props();

  const blank = () => ({ name: "", email: "", position: "F" as Position });
  let form = $state(blank());
  let busy = $state(false);

  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (busy) return;
    busy = true;
    try {
      if (await addMember(form.name.trim(), form.email.trim(), form.position)) {
        form = blank();
        open = false;
      }
    } finally {
      busy = false;
    }
  }
</script>

<Sheet bind:open title="Add a member">
  <form id="add-member" class="form" onsubmit={save}>
    <label class="field">
      <span>Name</span>
      <input class="input" required maxlength="80" autocomplete="off" bind:value={form.name} />
    </label>
    <label class="field">
      <span>Email</span>
      <input class="input" type="email" required autocomplete="off" bind:value={form.email} />
    </label>
    <div class="field">
      <span id="add-member-position">Position</span>
      <div class="seg" role="group" aria-labelledby="add-member-position">
        {#each Object.entries(POSITIONS) as [v, label] (v)}
          <button type="button" aria-pressed={form.position === v} onclick={() => (form.position = v as Position)}
            >{label}</button
          >
        {/each}
      </div>
    </div>
    <p class="hint">They're in straight away. We'll email them a link to the app; they sign in with this email.</p>
  </form>
  {#snippet footer()}
    <button class="btn primary" type="submit" form="add-member" disabled={busy}>Add and email them</button>
  {/snippet}
</Sheet>

<style>
  .hint {
    margin: 0;
  }
</style>
