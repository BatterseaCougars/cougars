<script lang="ts">
  // Full-screen pages hide the tabs and show this instead, frosted, sitting in the notch area.
  import Icon from "./Icon.svelte";

  let {
    href,
    label,
    title,
    right,
    onclick,
  }: {
    href: string;
    label: string;
    title: string;
    right?: string;
    /** Instead of following the link (going back in history); the link stays for a new tab. */
    onclick?: () => void;
  } = $props();
  const click = (e: MouseEvent) => {
    if (!onclick || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    onclick();
  };
</script>

<header class="backbar">
  <a class="back" {href} onclick={click}><Icon name="chevronLeft" size={20} />{label}</a>
  <span class="title">{title}</span>
  <span class="right hint">{right ?? ""}</span>
</header>

<style>
  .backbar {
    position: sticky;
    top: 0;
    z-index: 3;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: max(var(--s-2), env(safe-area-inset-top)) var(--s-2) var(--s-2);
    background: var(--chrome-bg-solid);
    backdrop-filter: var(--blur);
    -webkit-backdrop-filter: var(--blur);
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 0.1rem;
    min-height: 2.5rem;
    padding: 0 var(--s-2) 0 0;
    color: var(--red-hot);
    font-weight: 500;
  }
  .title {
    color: var(--fg);
    font-weight: 600;
  }
  .right {
    text-align: right;
  }
</style>
