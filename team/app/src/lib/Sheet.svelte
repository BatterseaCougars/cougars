<script lang="ts">
  /**
   * A sheet up from the bottom of a phone (the Filters sheet). A native modal dialog, so it sits above everything,
   * traps focus and closes on Escape; a tap on the dimmed page closes it too.
   */
  import type { Snippet } from "svelte";
  import Icon from "../app/shell/Icon.svelte";

  let {
    open = $bindable(false),
    title,
    children,
    footer,
  }: { open?: boolean; title: string; children: Snippet; footer?: Snippet } = $props();

  let dialog = $state<HTMLDialogElement | undefined>();
  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });
</script>

<dialog
  bind:this={dialog}
  class="bottom-sheet"
  aria-label={title}
  onclose={() => (open = false)}
  onclick={(e) => e.target === dialog && (open = false)}
>
  <div class="body">
    <div class="head">
      <h2 class="title">{title}</h2>
      <button class="btn ghost icon" aria-label="Close" onclick={() => (open = false)}
        ><Icon name="x" size={18} /></button
      >
    </div>
    {@render children()}
    {#if footer}<div class="foot">{@render footer()}</div>{/if}
  </div>
</dialog>

<style>
  .bottom-sheet {
    width: 100%;
    max-width: 100%;
    max-height: 85dvh;
    margin: auto 0 0;
    padding: 0;
    border: 0;
    border-radius: var(--r-xl) var(--r-xl) 0 0;
    background: var(--surface-1);
    color: var(--fg);
    box-shadow: var(--shadow-pop);
  }
  .bottom-sheet[open] {
    animation: up var(--t-slow) var(--ease);
  }
  .bottom-sheet::backdrop {
    background: color-mix(in srgb, var(--bg) 60%, transparent);
  }
  @keyframes up {
    from {
      translate: 0 100%;
    }
  }
  .body {
    display: grid;
    gap: var(--s-4);
    padding: var(--s-3) var(--gutter) max(var(--s-5), env(safe-area-inset-bottom));
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .title {
    font-size: var(--text-md);
    font-weight: 600;
  }
  .foot {
    display: flex;
    gap: var(--s-2);
  }
  .foot > :global(.btn) {
    flex: 1;
  }
</style>
