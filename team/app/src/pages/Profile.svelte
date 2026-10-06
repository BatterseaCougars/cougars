<script lang="ts">
  import BackLink from "../lib/BackLink.svelte";
  import { emailFor } from "../demo/data";
  import { impersonating, me, rolesOf } from "../demo/session.svelte";
  import { initials } from "../lib/initials";

  const who = me();
  let form = $state({ name: who.name, email: emailFor(who), phone: "07700 900000", position: who.position });
  const locked = impersonating();
</script>

<div class="page">
  <BackLink />
  <header class="head">
    <span class="avatar big">{initials(form.name)}</span>
    <div>
      <h1>{form.name}</h1>
      <p class="roles">
        {#each rolesOf(who.id) as r (r)}<span class="badge" class:red={r === "Admin"}>{r}</span>{/each}
      </p>
    </div>
  </header>
  <form class="form" onsubmit={(e) => e.preventDefault()}>
    <fieldset disabled={locked}>
      <label class="field">Name <input class="input" bind:value={form.name} /></label>
      <label class="field">Email <input class="input" type="email" bind:value={form.email} /></label>
      <label class="field">Phone <input class="input" type="tel" bind:value={form.phone} /></label>
      <label class="field">
        Position
        <select class="input" bind:value={form.position}>
          <option value="F">Forward</option>
          <option value="D">Defence</option>
        </select>
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
  fieldset {
    display: grid;
    gap: var(--s-4);
    margin: 0;
    padding: 0;
    border: 0;
  }
</style>
