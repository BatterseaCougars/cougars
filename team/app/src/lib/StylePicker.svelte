<script lang="ts">
  // Pick the icon and colour a training or tournament shows with in the menu and the calendar.
  import Icon from "../app/shell/Icon.svelte";
  import { SCHEDULE_ICONS, TONES, type ScheduleIcon, type Tone } from "../demo/model";

  let { icon = $bindable(), tone = $bindable() }: { icon: ScheduleIcon; tone: Tone } = $props();
</script>

<div class="field">
  Icon
  <div class="choices" role="radiogroup" aria-label="Icon">
    {#each SCHEDULE_ICONS as i (i)}
      <button
        type="button"
        class="choice"
        role="radio"
        aria-checked={icon === i}
        aria-label={i}
        style:--tone="var(--tone-{tone})"
        onclick={() => (icon = i)}
      >
        <Icon name={i} size={20} />
      </button>
    {/each}
  </div>
</div>
<div class="field">
  Colour
  <div class="choices" role="radiogroup" aria-label="Colour">
    {#each TONES as t (t)}
      <button
        type="button"
        class="swatch"
        role="radio"
        aria-checked={tone === t}
        aria-label={t}
        style:--tone="var(--tone-{t})"
        onclick={() => (tone = t)}
      ></button>
    {/each}
  </div>
</div>

<style>
  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
  }
  .choice {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    border: 0;
    border-radius: var(--r-md);
    background: var(--surface-2);
    color: var(--fg-muted);
    transition:
      background-color var(--t) var(--ease-in-out),
      color var(--t) var(--ease-in-out);
  }
  .choice:hover {
    background: var(--surface-3);
    color: var(--fg);
  }
  .choice[aria-checked="true"] {
    background: color-mix(in srgb, var(--tone) 24%, var(--surface-2));
    color: var(--tone);
  }
  .swatch {
    width: 2.25rem;
    height: 2.25rem;
    border: 2px solid transparent;
    border-radius: 50%;
    background: var(--tone) content-box;
    padding: 3px;
    transition: border-color var(--t) var(--ease-in-out);
  }
  .swatch[aria-checked="true"] {
    border-color: var(--fg);
  }
</style>
