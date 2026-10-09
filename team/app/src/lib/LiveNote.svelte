<script lang="ts">
  // What a live page says about following along (ADR 0072): "Live" while the hub's stream is open, else how often it
  // checks (the admins' setting, ADR 0072). Both are laid out on top of each other so the words can swap without
  // anything around them moving.
  import { everyHowOften, liveFeed } from "./live-updates.svelte";

  let { what = "Updates", tail = "" }: { what?: string; tail?: string } = $props();
</script>

<span class="swap">
  <span class="word" class:ghost={!liveFeed.on} aria-hidden={!liveFeed.on}>Live{tail}</span>
  <span class="word" class:ghost={liveFeed.on} aria-hidden={liveFeed.on}>{what} {everyHowOften()}{tail}</span>
</span>

<style>
  .swap {
    display: inline-grid;
  }
  .word {
    grid-area: 1 / 1;
    white-space: nowrap;
  }
  .ghost {
    visibility: hidden;
  }
</style>
