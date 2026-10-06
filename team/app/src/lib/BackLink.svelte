<script lang="ts">
  // "‹ More" on pages opened from the More page (phones only; desktop has the rail).
  import Icon from "../app/shell/Icon.svelte";
</script>

<a class="back" href="/more"><Icon name="chevronLeft" size={18} />More</a>

<style>
  .back {
    display: none;
    align-items: center;
    gap: 0.1rem;
    margin: calc(-1 * var(--s-2)) 0 calc(-1 * var(--s-3)) -0.25rem;
    min-height: 2.25rem;
    color: var(--red-hot);
    font-size: var(--text-sm);
    font-weight: 500;
  }
  @media (max-width: 900px) {
    .back {
      display: inline-flex;
    }
  }
</style>
