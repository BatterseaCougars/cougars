<script lang="ts">
  // A score that rolls when it changes: the old figure rolls up and out, the new one up from below, like a counter.
  // Only a change rolls (not the first show). Takes the size and face of where it sits. Reduced motion: it just
  // changes.
  import { prefersReducedMotion } from "../app/motion";

  let { value }: { value: number | string } = $props();

  const roll = (from: number, to: number) => (_node: Element) =>
    prefersReducedMotion
      ? { duration: 0 }
      : {
          duration: 320,
          easing: (t: number) => 1 - Math.pow(1 - t, 3),
          css: (t: number) => `transform: translateY(${(from + (to - from) * t).toFixed(1)}%)`,
        };
  const rollIn = roll(100, 0);
  const rollOut = roll(-100, 0);
</script>

<span class="roll">
  {#key value}
    <span class="n" in:rollIn out:rollOut>{value}</span>
  {/key}
</span>

<style>
  /* One line high: the figures roll through it, the old and new sharing its place as they pass */
  .roll {
    display: inline-grid;
    overflow: hidden;
    vertical-align: bottom;
  }
  .n {
    grid-area: 1 / 1;
  }
</style>
