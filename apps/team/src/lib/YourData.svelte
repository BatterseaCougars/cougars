<script lang="ts">
  // Your data (#30, ADR 0029), at the foot of your profile: download everything the app holds about you, or delete
  // your account. Deleting asks first, in a sheet that says what goes and what the club keeps; then you're signed out
  // everywhere and the app goes back to its sign-in screen.
  import { api } from "../app/api";
  import Icon from "../app/shell/Icon.svelte";
  import Sheet from "./Sheet.svelte";

  let { disabled = false }: { disabled?: boolean } = $props();

  let asking = $state(false);
  let busy = $state(false);
  let error = $state("");

  // A file to keep, named for the day: the browser downloads it
  function download() {
    const a = document.createElement("a");
    a.href = "/api/me/data";
    a.download = "";
    a.click();
  }

  async function remove() {
    busy = true;
    error = "";
    try {
      await api("DELETE", "/api/me");
      location.replace("/");
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      busy = false;
    }
  }
</script>

<section class="data">
  <h2 class="section-title">Your data</h2>
  <p class="hint">
    Everything the app holds about you, as a file: your details, sign-ups, payments and the devices you've signed in on.
    What the club keeps, who sees it and for how long: <a href="/privacy">Privacy</a>.
  </p>
  <div class="actions">
    <button class="btn outline sm" type="button" {disabled} onclick={download}
      ><Icon name="download" size={16} />Download my data</button
    >
    <button class="btn ghost sm danger" type="button" {disabled} onclick={() => (asking = true)}
      >Delete my account</button
    >
  </div>
</section>

<Sheet bind:open={asking} title="Delete your account?">
  <div class="ask">
    <p>
      Your name, email, phone, bio and roles go now, and you're signed out on every device. You can't sign in again with
      this email; to come back, ask an admin to add you.
    </p>
    <p class="hint">
      What the club must keep stays, about a "Former member" nobody can name: that someone played a Friday, and payments
      in its accounts. Places you'd taken for what's still to come are given up.
    </p>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  </div>
  {#snippet footer()}
    <button class="btn ghost" type="button" onclick={() => (asking = false)}>Keep my account</button>
    <button class="btn delete" type="button" disabled={busy} onclick={remove}>Delete my account</button>
  {/snippet}
</Sheet>

<style>
  .data {
    display: grid;
    gap: var(--s-3);
  }
  .data .section-title {
    margin: var(--s-6) 0 0;
  }
  .data p {
    margin: 0;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
  }
  /* Delete in red words; asked, the one red fill is the tap that does it */
  .danger {
    color: var(--red-hot);
  }
  .ask {
    display: grid;
    gap: var(--s-3);
  }
  .ask p {
    margin: 0;
  }
  .delete {
    background: var(--red);
    color: var(--on-red);
  }
  .delete:hover:not(:disabled) {
    background: var(--red-hot);
  }
  .error {
    color: var(--red-hot);
  }
</style>
