<script lang="ts">
  // Your profile. You change your phone, position and bio (the back of your player card); your name and email
  // are an admin's to change, since sign-in and the roster go by them.
  import { POSITIONS, emailFor, phoneFor, type Position } from "../demo/data";
  import { impersonating, me, rolesOf } from "../demo/session.svelte";
  import { initials } from "../lib/initials";
  import { saveProfile } from "../app/backend.svelte";

  const who = me();
  let form = $state({ phone: phoneFor(who.id) ?? "", position: who.position, bio: who.bio ?? "" });
  const locked = impersonating();
  const BIO_MAX = 160;
  function save(e: SubmitEvent) {
    e.preventDefault();
    saveProfile({ ...form, phone: form.phone.trim(), bio: form.bio.trim() });
  }
</script>

<div class="page">
  <header class="head">
    <span class="avatar big">{initials(who.name)}</span>
    <div>
      <h1>{who.name}</h1>
      <p class="roles">
        {#each rolesOf(who.id) as r (r)}<span class="badge" class:red={r === "Admin"}>{r}</span>{/each}
      </p>
    </div>
  </header>
  <form class="form" onsubmit={save}>
    <fieldset disabled={locked}>
      <label class="field">
        Email <span class="hint">ask an admin to change it</span>
        <input class="input" type="email" value={emailFor(who)} readonly />
      </label>
      <label class="field">Phone <input class="input" type="tel" maxlength="30" bind:value={form.phone} /></label>
      <div class="field">
        <span id="position">Position</span>
        <div class="seg" role="group" aria-labelledby="position">
          {#each Object.entries(POSITIONS) as [v, label] (v)}
            <button type="button" aria-pressed={form.position === v} onclick={() => (form.position = v as Position)}>
              {label}
            </button>
          {/each}
        </div>
      </div>
      <label class="field">
        Bio <span class="hint">on the back of your player card</span>
        <textarea
          class="input"
          rows="3"
          maxlength={BIO_MAX}
          placeholder="Shoots left. Blames the ice."
          bind:value={form.bio}></textarea>
      </label>
      <button class="btn primary">Save</button>
    </fieldset>
    {#if locked}<p class="hint">Read-only while you're viewing as {who.name.split(" ")[0]}.</p>{/if}
  </form>
</div>

<style>
  .head {
    display: flex;
    align-items: center;
    gap: var(--s-4);
  }
  h1 {
    font-size: var(--text-lg);
    font-weight: 600;
  }
  .avatar.big {
    width: 4rem;
    height: 4rem;
    font-size: var(--text-lg);
    border-color: var(--red-border);
    background: var(--red-wash-strong);
    color: var(--fg);
  }
  .roles {
    display: flex;
    gap: var(--s-1);
    margin-top: var(--s-2);
  }
  .seg {
    display: flex;
  }
  fieldset {
    display: grid;
    gap: var(--s-4);
    margin: 0;
    padding: 0;
    border: 0;
  }
</style>
