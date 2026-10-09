<script lang="ts">
  import { addRole as addRoleOnServer, saveRole } from "../app/backend.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import PageHeader from "../lib/PageHeader.svelte";
  import SearchField from "../lib/SearchField.svelte";
  import { ACTIONS, actionsBySubject, type Action } from "../access/actions";
  import { db } from "../demo/store.svelte";

  let selected = $state(db.roles[0].id);
  const role = $derived(db.roles.find((r) => r.id === selected)!);
  // One row per action, in its group's order; the search matches its name, key, group or what it does
  const rows = actionsBySubject()
    .filter(([subject]) => subject !== "all")
    .flatMap(([group, actions]) => actions.map((action) => ({ action, group, ...ACTIONS[action] })));
  let query = $state("");
  const shown = $derived.by(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter((r) => {
      const text = `${r.name} ${r.action} ${r.group} ${r.description}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  });

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
    {#snippet actions()}
      <button class="btn sm primary" onclick={addRole}><Icon name="plus" size={16} />Role</button>
    {/snippet}
    {#snippet toolbar()}
      <!-- The app's filter chips, kept in the toolbar (not the phone's Filters sheet): which role you're editing -->
      <div class="filters" role="group" aria-label="Roles">
        {#each db.roles as r (r.id)}
          <button class="filter" aria-pressed={r.id === selected} onclick={() => (selected = r.id)}>{r.name}</button>
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
        <SearchField bind:value={query} placeholder="Search actions" />
        <div class="scroll">
          <table class="actions">
            <thead>
              <tr>
                <th><span class="sr-only">Allowed</span></th>
                <th>Action</th>
                <th>Group</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {#each shown as r (r.action)}
                <tr>
                  <td class="tick">
                    <label class="hit">
                      <input
                        type="checkbox"
                        aria-label={r.name}
                        checked={role.actions.includes(r.action)}
                        onchange={() => toggle(r.action)}
                      />
                    </label>
                  </td>
                  <td><strong>{r.name}</strong><code>{r.action}</code></td>
                  <td>{r.group}</td>
                  <td class="what">{r.description}</td>
                </tr>
              {:else}
                <tr><td colspan="4" class="none">No actions match “{query.trim()}”.</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/key}
</div>

<style>
  .role {
    display: grid;
    gap: var(--s-5);
  }
  .panel h2 {
    font-size: var(--text-md);
    font-weight: 600;
    margin-bottom: var(--s-2);
  }
  code {
    font-size: var(--text-xs);
  }
  /* The name is what people read; the key under it is for whoever's looking at the code */
  td strong {
    display: block;
    color: var(--fg);
    font-weight: 500;
  }
  td code {
    display: block;
    color: var(--fg-muted);
  }
  .scroll {
    overflow-x: auto;
  }
  .actions {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    padding: var(--s-3);
    text-align: left;
    vertical-align: middle;
    white-space: nowrap;
  }
  thead th {
    padding-bottom: var(--s-2);
    color: var(--fg-muted);
    font-size: var(--text-2xs);
    font-weight: 600;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
  }
  td {
    border-top: 1px solid var(--border);
    color: var(--fg-body);
  }
  /* The whole row ticks the box: the checkbox's hit area stretches over the row */
  tbody tr {
    position: relative;
  }
  tbody tr:hover td {
    background: var(--surface-2);
  }
  .tick {
    width: 1px;
  }
  .hit {
    display: flex;
    cursor: pointer;
  }
  .hit::after {
    content: "";
    position: absolute;
    inset: 0;
  }
  .what {
    width: 100%;
    white-space: normal;
  }
  .none {
    color: var(--fg-muted);
  }
</style>
