<script lang="ts">
  // Your profile. You change your phone, position and bio (the back of your player card); your name and email
  // are an admin's to change, since sign-in and the roster go by them.
  import { POSITIONS, emailFor, phoneFor, type Position } from "../demo/data";
  import { fullRole, impersonating, me, realGranted, session, setElevated, shownRoles } from "../demo/session.svelte";
  import { db } from "../demo/store.svelte";
  import Select from "../lib/Select.svelte";
  import { initials } from "../lib/initials";
  import { saveEverydayRole, saveProfile } from "../app/backend.svelte";

  const who = me();
  let form = $state({ phone: phoneFor(who.id) ?? "", position: who.position, bio: who.bio ?? "" });
  const locked = impersonating();
  const BIO_MAX = 160;

  // Your everyday role (ADR 0037): anyone with more than Member can open the app as a lesser role, so ratings and admin
  // screens stay hidden while they show someone the app; the switch beside their badge brings their full role back.
  // The choices are roles that can do less than you can.
  const full = fullRole();
  const mine = realGranted();
  const everydayOptions = $derived([
    { value: "full", label: `${full} (everything you can do)` },
    ...db.roles
      .filter((r) => r.name !== full && (mine.has("manage:all") || r.actions.every((a) => mine.has(a))))
      .map((r) => ({ value: String(r.id), label: r.name })),
  ]);
  function setEveryday(value: string) {
    const id = value === "full" ? null : Number(value);
    session.everyday = id;
    setElevated(false);
    saveEverydayRole(id);
  }
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
        {#each shownRoles(who.id) as r (r)}<span class="badge" class:red={r === "Admin"}>{r}</span>{/each}
      </p>
    </div>
  </header>
  <form class="form" onsubmit={save}>
    <fieldset disabled={locked}>
      <label class="field">
        <span>Email <span class="hint">· ask an admin to change it</span></span>
        <input class="input" type="email" value={emailFor(who)} readonly />
      </label>
      <label class="field">Phone <input class="input" type="tel" maxlength="30" bind:value={form.phone} /></label>
      <div class="field">
        <span id="position">Position</span>
        <div class="seg block" role="group" aria-labelledby="position">
          {#each Object.entries(POSITIONS) as [v, label] (v)}
            <button type="button" aria-pressed={form.position === v} onclick={() => (form.position = v as Position)}>
              {label}
            </button>
          {/each}
        </div>
      </div>
      <label class="field">
        <span>Bio <span class="hint">· on the back of your player card</span></span>
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

  {#if full !== "Member" && !locked}
    <section class="everyday">
      <h2 class="section-title">Everyday role</h2>
      <label class="field">
        The app opens as
        <Select
          id="everyday-role"
          value={session.everyday === null ? "full" : String(session.everyday)}
          options={everydayOptions}
          onchange={setEveryday}
        />
      </label>
      <p class="hint">
        Handy when you show someone the app: ratings and {full} screens stay hidden. The {full} button beside your badge switches
        you up until you switch back or close the app.
      </p>
    </section>
  {/if}
</div>

<style>
  .head {
    display: flex;
    align-items: center;
    gap: var(--s-4);
  }
  /* Your name in the display face, as the member editor and the back of your card show it */
  h1 {
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 3vw, 2.1rem);
    font-style: italic;
    font-weight: 400;
    letter-spacing: 0.01em;
    line-height: 1.05;
    text-transform: uppercase;
  }
  .roles {
    display: flex;
    gap: var(--s-1);
    margin-top: var(--s-2);
  }
  .everyday {
    display: grid;
    gap: var(--s-3);
  }
  .everyday .section-title {
    margin: var(--s-4) 0 0;
  }
  fieldset {
    display: grid;
    gap: var(--s-4);
    margin: 0;
    padding: 0;
    border: 0;
  }
</style>
