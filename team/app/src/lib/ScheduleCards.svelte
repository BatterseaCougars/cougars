<script lang="ts" module>
  import type { IconName } from "../app/shell/icons";

  export interface ScheduleCard {
    id: number;
    icon: IconName;
    tone: string;
    /** Running, Paused, Members only… with a badge colour ("green", or none for grey). */
    status: { label: string; tone?: "green" };
    /** The line above the name: how often, or the format. */
    eyebrow: string;
    name: string;
    next: string;
    /** Smaller lines under Next. */
    lines: string[];
  }
</script>

<script lang="ts">
  // Things the club schedules, as cards (Settings → Training, Settings → Tournaments), the way Gwenda ops shows its
  // series: what it is and when, what's next, and whether it's running. A card opens that one's editor in a modal
  // panel (EditorPanel); the last card opens a blank one.
  import Icon from "../app/shell/Icon.svelte";

  let {
    cards,
    add,
    onopen,
  }: { cards: ScheduleCard[]; add: { name: string; hint: string }; onopen: (id: number | "new") => void } = $props();
</script>

<ul class="grid">
  {#each cards as c (c.id)}
    <li>
      <button type="button" class="card panel glass" style:--tone="var(--tone-{c.tone})" onclick={() => onopen(c.id)}>
        <span class="top">
          <span class="chip"><Icon name={c.icon} size={20} /></span>
          <span class="badge {c.status.tone ?? ''}">{c.status.label}</span>
        </span>
        <span class="eyebrow">{c.eyebrow}</span>
        <span class="name">{c.name}</span>
        <span class="line"><span class="label">Next</span> {c.next}</span>
        {#each c.lines as line, i (i)}<span class="line muted num">{line}</span>{/each}
        <span class="go"><Icon name="chevronRight" size={18} /></span>
      </button>
    </li>
  {/each}
  <li>
    <button type="button" class="card new" onclick={() => onopen("new")}>
      <span class="plus"><Icon name="plus" size={22} /></span>
      <span class="name">{add.name}</span>
      <span class="line muted">{add.hint}</span>
    </button>
  </li>
</ul>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
    gap: var(--s-4);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .card {
    position: relative;
    width: 100%;
    font: inherit;
    text-align: left;
    cursor: pointer;
    display: grid;
    align-content: start;
    gap: var(--s-1);
    height: 100%;
    padding: var(--s-4);
    color: var(--fg-muted);
    transition: border-color var(--t-fast) var(--ease-in-out);
  }
  .card:hover {
    border-color: var(--border-strong);
  }
  .card:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--s-2);
  }
  .chip {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: var(--r-md);
    background: color-mix(in srgb, var(--tone) 16%, transparent);
    color: var(--tone);
  }
  .name {
    color: var(--fg);
    font-size: var(--text-md);
    font-weight: 600;
  }
  .line {
    font-size: var(--text-sm);
    color: var(--fg);
  }
  .line.muted {
    color: var(--fg-muted);
  }
  .label {
    color: var(--fg-subtle);
    font-size: var(--text-2xs);
    font-weight: 700;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
  }
  .go {
    position: absolute;
    right: var(--s-3);
    bottom: var(--s-3);
    color: var(--fg-subtle);
    transition: color var(--t-fast) var(--ease-in-out);
  }
  .card:hover .go {
    color: var(--fg);
  }
  .card.new {
    place-content: center;
    justify-items: center;
    min-height: 12rem;
    border: 1px dashed var(--border-strong);
    border-radius: var(--r-lg);
    background: none;
    text-align: center;
  }
  .card.new:hover {
    border-color: var(--fg-subtle);
  }
  .plus {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    margin-bottom: var(--s-2);
    border-radius: 50%;
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    color: var(--fg);
  }
</style>
