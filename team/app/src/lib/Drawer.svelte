<script lang="ts">
  // A side drawer for a quick job on top of the page (the register): it slides in from the right and leaves the
  // page visible beside it on desktop. Phones get it full width. Escape, the close button or the scrim close it.
  import type { Snippet } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import Icon from "../app/shell/Icon.svelte";

  let {
    open = $bindable(false),
    title,
    sub,
    head,
    children,
    footer,
  }: {
    open?: boolean;
    title: string;
    sub?: string;
    /** Beside the title (a status badge). */
    head?: Snippet;
    children: Snippet;
    footer?: Snippet;
  } = $props();

  function onkeydown(e: KeyboardEvent) {
    if (open && e.key === "Escape") open = false;
  }
</script>

<svelte:window {onkeydown} />

{#if open}
  <button class="scrim" aria-label="Close" onclick={() => (open = false)} transition:fade={{ duration: 180 }}></button>
  <div
    class="drawer"
    role="dialog"
    aria-modal="true"
    aria-label={title}
    transition:fly={{ x: 420, duration: 280, easing: cubicOut, opacity: 1 }}
  >
    <header>
      <div class="titles">
        <h2>{title}</h2>
        {#if sub}<p class="hint">{sub}</p>{/if}
      </div>
      {@render head?.()}
      <button class="btn ghost icon" aria-label="Close" onclick={() => (open = false)}>
        <Icon name="x" size={20} />
      </button>
    </header>
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
    display: grid;
    grid-template-rows: auto 1fr auto;
    width: min(26rem, 100vw);
    border-left: 1px solid var(--border-strong);
    background:
      linear-gradient(180deg, rgb(255 255 255 / 0.04), transparent 30%),
      color-mix(in srgb, var(--surface-1) 88%, transparent);
    backdrop-filter: var(--blur);
    -webkit-backdrop-filter: var(--blur);
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
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--fg);
  }
  .body {
    display: grid;
    align-content: start;
    gap: var(--s-4);
    padding: var(--s-4) var(--s-5) var(--s-5);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  footer {
    padding: var(--s-3) var(--s-5) max(var(--s-4), env(safe-area-inset-bottom));
    border-top: 1px solid var(--border);
  }
  @media (max-width: 900px) {
    .drawer {
      width: 100vw;
      border-left: 0;
    }
  }
</style>
