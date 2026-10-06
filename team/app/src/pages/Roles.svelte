<script lang="ts">
  import { addRole as addRoleOnServer, saveRole } from "../app/backend.svelte";
  import PageHeader from "../lib/PageHeader.svelte";
  import { ACTIONS, actionsBySubject, type Action } from "../access/actions";
  import { db } from "../demo/store.svelte";

  let selected = $state(db.roles[0].id);
  const role = $derived(db.roles.find((r) => r.id === selected)!);
  const groups = actionsBySubject().filter(([subject]) => subject !== "all");

  // Each change is saved as it's made; the name a moment after you stop typing.
  function toggle(action: Action) {
    role.actions = role.actions.includes(action) ? role.actions.filter((a) => a !== action) : [...role.actions, action];
    saveRole(role);
  }
  let typing: ReturnType<typeof setTimeout> | undefined;
  function rename() {
    clearTimeout(typing);
    const r = role;
    typing = setTimeout(() => r.name.trim() && saveRole(r), 600);
  }
  async function addRole() {
    const taken = new Set(db.roles.map((r) => r.name));
    let n = 1;
    while (taken.has(`New role ${n}`)) n++;
    const created = await addRoleOnServer(`New role ${n}`);
    if (created) selected = created.id;
  }
</script>

<div class="page">
  <PageHeader title="Roles" subtitle="A role is a set of actions. Every page and button checks an action.">
    {#snippet actions()}<button class="btn outline sm" onclick={addRole}>+ Role</button>{/snippet}
    {#snippet toolbar()}
      <div class="seg roles" role="tablist" aria-label="Roles">
        {#each db.roles as r (r.id)}
          <button role="tab" aria-selected={r.id === selected} onclick={() => (selected = r.id)}>{r.name}</button>
        {/each}
      </div>
    {/snippet}
  </PageHeader>

  {#key selected}
    <div class="role rise">
      {#if role.system}
        <div class="panel pad feature">
          <h2>{role.name}</h2>
          <p class="hint">
            Can do everything (<code>manage:all</code>). It can't be edited, and the last admin can't be removed.
          </p>
        </div>
      {:else}
        <label class="field">Name <input class="input" bind:value={role.name} oninput={rename} /></label>
        {#each groups as [subject, actions] (subject)}
          <h2 class="section-title">{subject}</h2>
          <div class="list">
            {#each actions as action (action)}
              <label class="row check">
                <input type="checkbox" checked={role.actions.includes(action)} onchange={() => toggle(action)} />
                <span class="grow"><span class="title">{ACTIONS[action]}</span><code class="sub">{action}</code></span>
              </label>
            {/each}
          </div>
        {/each}
      {/if}
    </div>
  {/key}
</div>

<style>
  .roles {
    display: flex;
    flex-wrap: wrap;
  }
  .role {
    display: grid;
    gap: var(--s-5);
  }
  .check {
    cursor: pointer;
  }
  .panel h2 {
    font-size: var(--text-md);
    font-weight: 600;
    margin-bottom: var(--s-2);
  }
  code {
    font-size: var(--text-xs);
  }
</style>
