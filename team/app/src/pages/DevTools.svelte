<script lang="ts">
  // Settings → Dev tools (ADR 0077): only outside production. Who gets their own email here, so an admin can sign in
  // on dev without a deploy; everyone else's email goes to the dev account's inbox. Takes effect at once.
  import { api } from "../app/api";
  import { save } from "../app/backend.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import PageHeader from "../lib/PageHeader.svelte";
  import { MEMBERS, emailFor } from "../demo/data";

  let addresses = $state<string[] | null>(null);
  let typed = $state("");

  async function load() {
    addresses = (await api<{ addresses: string[] }>("GET", "/api/dev/mail")).addresses;
  }
  void load();

  async function add(address: string) {
    const ok = await save(() => api("POST", "/api/dev/mail", { email: address }), "Added");
    if (ok) {
      typed = "";
      await load();
    }
  }
  async function remove(address: string) {
    if (await save(() => api("DELETE", "/api/dev/mail", { email: address }), "Taken off")) await load();
  }

  const nameOf = (address: string) => MEMBERS.find((m) => emailFor(m.player).toLowerCase() === address)?.player.name;
</script>

<div class="page">
  <PageHeader title="Dev tools" subtitle="Only here, never in production. Changes take effect at once." />

  <section class="part">
    <h2 class="section-title">Who gets their own email</h2>
    <p class="hint">
      Here, email goes to the dev account's inbox instead of the person it's for. Admins always get their own, so they
      can sign in. Add anyone else who needs to: they get theirs too. Everyone else's still goes to the dev inbox.
    </p>

    {#if addresses === null}
      <p class="hint">Loading…</p>
    {:else}
      <div class="list">
        {#each addresses as address (address)}
          <div class="row">
            <span class="grow">
              <span class="who">{nameOf(address) ?? address}</span>
              {#if nameOf(address)}<span class="hint">{address}</span>{/if}
            </span>
            <button class="btn ghost sm" onclick={() => remove(address)}><Icon name="x" size={16} />Take off</button>
          </div>
        {:else}
          <div class="row empty"><span class="hint">Nobody yet besides the admins.</span></div>
        {/each}
      </div>

      <form
        class="add"
        onsubmit={(e) => {
          e.preventDefault();
          if (typed.trim()) void add(typed.trim());
        }}
      >
        <input
          class="input"
          type="email"
          placeholder="name@example.com"
          aria-label="Email address"
          bind:value={typed}
        />
        <button class="btn primary" type="submit" disabled={!typed.trim()}><Icon name="plus" size={16} />Add</button>
      </form>
    {/if}
  </section>
</div>

<style>
  .part {
    display: grid;
    gap: var(--s-3);
  }
  .part .section-title,
  .part .hint {
    margin: 0;
  }
  .grow {
    display: grid;
    flex: 1;
    gap: 0.1rem;
    min-width: 0;
  }
  .who {
    color: var(--fg);
    font-weight: 500;
  }
  .row .btn {
    gap: var(--s-1);
  }
  .add {
    display: flex;
    gap: var(--s-2);
  }
  .add .btn {
    gap: var(--s-1);
  }
</style>
