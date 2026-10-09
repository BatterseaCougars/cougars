<script lang="ts">
  // An admin brings players in from a file, in a side drawer over Members (ADR 0065): a spreadsheet saved as CSV, or
  // the roster's JSON. Choosing the file checks it (nothing changes yet) and lists who'd be added, who's in already
  // and any rows to fix; then one tap adds them all. Nobody is emailed (worker/member-import.ts).
  import Drawer from "./Drawer.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import { checkImport, importMembers, type ImportCheck } from "../app/backend.svelte";

  let { open = $bindable(false) }: { open?: boolean } = $props();

  let fileName = $state("");
  let file = $state("");
  let check = $state<ImportCheck | null>(null);
  let failed = $state("");
  let busy = $state(false);
  let input: HTMLInputElement | undefined = $state();

  // Each time it opens, it starts with no file
  $effect(() => {
    if (open) return;
    fileName = file = failed = "";
    check = null;
  });

  async function choose() {
    const picked = input?.files?.[0];
    if (!picked) return;
    fileName = picked.name;
    check = null;
    failed = "";
    busy = true;
    try {
      file = await picked.text();
      check = await checkImport(file);
    } catch (e) {
      failed = e instanceof Error ? e.message : "Couldn't read that file.";
    } finally {
      busy = false;
      if (input) input.value = "";
    }
  }

  async function add() {
    if (busy || !check?.add.length || check.problems.length) return;
    busy = true;
    try {
      if (await importMembers(file)) open = false;
    } finally {
      busy = false;
    }
  }

  const POS = { F: "Forward", D: "Defence", G: "Goalie" } as const;
</script>

<Drawer bind:open title="Import members" sub="From a spreadsheet saved as CSV">
  <div class="stack">
    <p class="hint">
      The first row names the columns: <strong>name</strong> (needed), <strong>email</strong>,
      <strong>position</strong> (F, D or G), <strong>rating</strong> (0–100, 50 if blank),
      <strong>cougar</strong> (yes or no) and <strong>roles</strong> (separated by ;). Anyone already in the club is left
      as they are. Nobody is emailed: they sign in with their email when you tell them.
    </p>

    <label class="btn outline block">
      <Icon name="upload" size={18} />
      {busy && !check ? "Checking…" : fileName ? "Choose another file" : "Choose a file"}
      <input bind:this={input} class="sr-only" type="file" accept=".csv,.json,text/csv" onchange={choose} />
    </label>

    {#if failed}
      <p class="problem" role="alert">{fileName}: {failed}</p>
    {/if}

    {#if check}
      {#if check.problems.length}
        <section>
          <h3>Fix these first ({check.problems.length})</h3>
          <ul>
            {#each check.problems as p, i (i)}
              <li>
                <span class="row">Row {p.row}</span> <strong>{p.name || "No name"}</strong>
                <span class="why">{p.why}</span>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
      <section>
        <h3>To add ({check.add.length})</h3>
        {#if check.add.length}
          <ul>
            {#each check.add as p (p.row)}
              <li>
                <strong>{p.name}</strong>
                <span
                  >{POS[p.position]} · {p.rating}{p.cougar ? " · Cougar" : ""}{p.roles.length
                    ? ` · ${p.roles.join(", ")}`
                    : ""}</span
                >
                <span class="email">{p.email ?? "No email: can't sign in yet"}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="hint">Nobody new in {fileName}.</p>
        {/if}
      </section>
      {#if check.skip.length}
        <section>
          <h3>Already in ({check.skip.length})</h3>
          <p class="hint">{check.skip.map((s) => s.name).join(", ")}</p>
        </section>
      {/if}
    {/if}
  </div>

  {#snippet footer()}
    <button class="btn primary" disabled={busy || !check?.add.length || !!check?.problems.length} onclick={add}>
      {check?.add.length ? `Add ${check.add.length} member${check.add.length === 1 ? "" : "s"}` : "Add members"}
    </button>
  {/snippet}
</Drawer>

<style>
  .stack {
    display: grid;
    gap: var(--s-4);
  }
  .hint {
    margin: 0;
  }
  label.btn {
    position: relative;
    cursor: pointer;
  }
  h3 {
    margin: 0 0 var(--s-2);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--fg-muted);
  }
  ul {
    display: grid;
    gap: var(--s-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: grid;
    gap: 0.1rem;
    font-size: var(--text-sm);
    color: var(--fg-muted);
  }
  li strong {
    color: var(--fg);
    font-size: var(--text-md);
    font-weight: 500;
  }
  .row,
  .email {
    font-size: var(--text-xs);
  }
  .problem,
  .why {
    color: var(--red-hot);
  }
  .problem {
    margin: 0;
  }
</style>
