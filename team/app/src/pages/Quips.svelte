<script lang="ts">
  // Settings → Quips: the lines Home says before you answer and when you do. Edits save as you type; a kind
  // keeps at least one line so Home always has something to say.
  import Icon from "../app/shell/Icon.svelte";
  import { db } from "../demo/store.svelte";
  import BackLink from "../lib/BackLink.svelte";
  import { QUIP_KINDS, QUIP_MAX, type QuipKind } from "../lib/quips";

  let kind = $state<QuipKind>("ask");
  let draft = $state("");
  const about = $derived(QUIP_KINDS.find((k) => k.kind === kind)!);
  const lines = $derived(db.quips.filter((q) => q.kind === kind));

  function add(e: SubmitEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    db.quips.push({ id: Math.max(0, ...db.quips.map((q) => q.id)) + 1, kind, text });
    draft = "";
  }
  function remove(id: number) {
    db.quips = db.quips.filter((q) => q.id !== id);
  }
</script>

<div class="page">
  <BackLink />
  <div class="page-head">
    <div>
      <h1>Quips</h1>
      <p class="hint">Home picks one at random. Short and cheeky, never needy, never a club fact.</p>
    </div>
  </div>

  <div class="stick">
    <div class="seg kinds" role="tablist" aria-label="When it's said">
      {#each QUIP_KINDS as k (k.kind)}
        <button role="tab" aria-selected={k.kind === kind} onclick={() => (kind = k.kind)}>
          {k.label} <span class="count num">{db.quips.filter((q) => q.kind === k.kind).length}</span>
        </button>
      {/each}
    </div>
  </div>

  {#key kind}
    <div class="lines rise">
      <p class="hint">{about.hint}.</p>
      <div class="list">
        {#each lines as q (q.id)}
          <div class="row">
            <input class="input line" maxlength={QUIP_MAX} bind:value={q.text} aria-label="Quip" />
            <button
              class="btn ghost icon"
              onclick={() => remove(q.id)}
              disabled={lines.length === 1}
              title={lines.length === 1 ? "Keep at least one" : "Delete"}
              aria-label="Delete “{q.text}”"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        {/each}
      </div>

      <form class="add" onsubmit={add}>
        <input
          class="input"
          maxlength={QUIP_MAX}
          placeholder="New {about.label.toLowerCase()} line"
          aria-label="New quip"
          bind:value={draft}
        />
        <button class="btn primary" disabled={!draft.trim()}>Add</button>
      </form>
      <p class="hint num">Up to {QUIP_MAX} characters, so it fits two lines on a phone.</p>
    </div>
  {/key}
</div>

<style>
  .kinds {
    display: flex;
  }
  .count {
    margin-left: 0.2em;
    opacity: 0.6;
  }
  .lines {
    display: grid;
    gap: var(--s-4);
  }
  .row {
    padding-block: var(--s-2);
  }
  .line {
    flex: 1;
    border-color: transparent;
    background: none;
  }
  .line:hover {
    border-color: var(--border);
  }
  .add {
    display: flex;
    gap: var(--s-2);
  }
</style>
