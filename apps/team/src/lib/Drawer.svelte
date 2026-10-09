<script lang="ts">
  // A side drawer for a quick job on top of the page (the register): it slides in from the right and leaves the
  // page visible beside it on desktop. Phones get it full width. Escape, the close button or the scrim close it.
  import type { Snippet } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { easeOut, fadeMs } from "../app/motion";
  import Icon from "../app/shell/Icon.svelte";

  let {
    open = $bindable(false),
    title,
    sub,
    head,
    top,
    children,
    footer,
    wide = false,
  }: {
    open?: boolean;
    title: string;
    sub?: string;
    /** Beside the title (a status badge). */
    head?: Snippet;
    /** Under the header, outside the scroll (stats and a search that stay put). */
    top?: Snippet;
    children: Snippet;
    footer?: Snippet;
    /** A form that needs the room (Charge a quarter): wider on desktop; phones are full width anyway. */
    wide?: boolean;
  } = $props();

  function onkeydown(e: KeyboardEvent) {
    if (open && e.key === "Escape") open = false;
  }
</script>

<svelte:window {onkeydown} />

{#if open}
  <button class="scrim" aria-label="Close" onclick={() => (open = false)} transition:fade={{ duration: fadeMs }}
  ></button>
  <div
    class="drawer"
    class:wide
    role="dialog"
    aria-modal="true"
    aria-label={title}
    transition:fly={{ x: 420, duration: 320, easing: easeOut, opacity: 1 }}
  >
    <header>
      <div class="titles">
        <h2>{title}</h2>
        {#if sub}<p class="hint">{sub}</p>{/if}
      </div>
      {@render head?.()}
      <button class="btn ghost icon" aria-label="Close" onclick={() => (open = false)}>
        <Icon name="x" size={18} />
      </button>
    </header>
    {#if top}<div class="top">{@render top()}</div>{/if}
    <div class="body">{@render children()}</div>
    {#if footer}<footer>{@render footer()}</footer>{/if}
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 70;
    border: 0;
    padding: 0;
    background: color-mix(in srgb, var(--bg) 40%, transparent);
  }
  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 71;
    display: flex;
    flex-direction: column;
    width: min(26rem, 100vw);
    border-left: 1px solid var(--border-strong);
    background: var(--surface-1);
    box-shadow: var(--shadow-pop);
  }
  header {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    padding: max(var(--s-4), env(safe-area-inset-top)) var(--s-4) var(--s-3) var(--s-5);
    border-bottom: 1px solid var(--border);
  }
  .titles {
    flex: 1;
    min-width: 0;
  }
  h2 {
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--fg);
  }
  .top {
    display: grid;
    gap: var(--s-4);
    padding: var(--s-4) var(--s-5) 0;
  }
  .body {
    /* min-height: 0 lets the body shrink below its content, so it scrolls instead of pushing the footer off */
    flex: 1;
    min-height: 0;
    display: grid;
    align-content: start;
    /* Rows keep their full height (a .list clips, so it would otherwise shrink to fit); the body scrolls instead */
    grid-auto-rows: max-content;
    gap: var(--s-4);
    padding: var(--s-4) var(--s-5) var(--s-5);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  footer {
    padding: var(--s-3) var(--s-5) max(var(--s-4), env(safe-area-inset-bottom));
    border-top: 1px solid var(--border);
  }
  .drawer.wide {
    width: min(36rem, 100vw);
  }
  @media (max-width: 900px) {
    .drawer,
    .drawer.wide {
      width: 100vw;
      border-left: 0;
    }
  }
</style>
