<script lang="ts">
  // Nothing here yet, said plainly on the page (not in a box): an icon, a line in the display face, what happens next,
  // and the one thing to do about it if there is one.
  import type { Snippet } from "svelte";
  import Icon from "../app/shell/Icon.svelte";
  import type { IconName } from "../app/shell/icons";

  let { icon, title, children, action }: { icon: IconName; title: string; children?: Snippet; action?: Snippet } =
    $props();
</script>

<section class="empty">
  <Icon name={icon} size={36} />
  <h3 class="display">{title}</h3>
  {#if children}<p>{@render children()}</p>{/if}
  {#if action}<div class="act">{@render action()}</div>{/if}
</section>

<style>
  .empty {
    display: grid;
    justify-items: center;
    gap: var(--s-3);
    max-width: 30rem;
    margin: 0 auto;
    padding-block: var(--s-10) var(--s-8);
    color: var(--fg-muted);
    text-align: center;
  }
  h3 {
    margin: 0;
    color: var(--fg);
    font-size: 2rem;
  }
  p {
    margin: 0;
    line-height: 1.5;
  }
  .act {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--s-2);
    margin-top: var(--s-2);
  }
  .act :global(.btn) {
    gap: var(--s-2);
  }
</style>
