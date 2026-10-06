<script lang="ts">
  // A section's pages (Games, Standings, Draft) as one solid group of pills, no outline. Desktop only.
  let { items, current }: { items: { id: string; path: string; label: string }[]; current: string } = $props();
</script>

<nav class="pills" aria-label="Pages">
  {#each items as r (r.id)}
    <a class="pill" class:on={r.id === current} href={r.path} aria-current={r.id === current ? "page" : undefined}>
      {r.label}
    </a>
  {/each}
</nav>

<style>
  .pills {
    display: inline-flex;
    flex-shrink: 0;
    gap: 2px;
    padding: 3px;
    border-radius: var(--r-md);
    background: var(--surface-2);
  }
  .pill {
    display: inline-flex;
    align-items: center;
    height: 1.95rem;
    padding: 0 var(--s-3);
    border-radius: var(--r-sm);
    color: var(--fg-muted);
    font-size: var(--text-sm);
    font-weight: 500;
    white-space: nowrap;
    transition:
      color var(--t) var(--ease-in-out),
      background-color var(--t) var(--ease-in-out);
  }
  .pill:hover,
  .pill.on {
    color: var(--fg);
  }
  .pill.on {
    background: color-mix(in srgb, var(--fg) 14%, var(--surface-2));
  }
</style>
