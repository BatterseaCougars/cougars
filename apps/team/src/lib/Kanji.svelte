<script lang="ts">
  // A touch of the Kumite's motif (lib/motif.ts): kanji beside a heading, or a red hanko seal. Decoration only, so
  // screen readers skip it.
  let { text, seal = false }: { text: string; seal?: boolean } = $props();
</script>

{#if text}<span class="kanji" class:seal lang="ja" aria-hidden="true">{text}</span>{/if}

<style>
  .kanji {
    margin-left: var(--s-2);
    color: var(--fg-subtle);
    font-family: var(--font-kanji);
    font-size: 0.85em;
    font-weight: 900;
    letter-spacing: 0.05em;
    vertical-align: 0.05em;
  }
  /* A hanko: the characters stacked in a red square, cream on red, a little askew */
  .seal {
    display: inline-grid;
    place-items: center;
    width: 3.25rem;
    height: 3.25rem;
    margin: 0;
    padding: 0.2rem;
    border-radius: 0.3rem;
    background: var(--red);
    color: var(--primary);
    font-size: 1.15rem;
    line-height: 1;
    writing-mode: vertical-rl;
    letter-spacing: 0;
    transform: rotate(-6deg);
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--primary) 35%, transparent);
  }
</style>
