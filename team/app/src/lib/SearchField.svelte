<script lang="ts">
  // Search at the top of a list. The clear button keeps its place, so typing never moves anything.
  import Icon from "../app/shell/Icon.svelte";

  let {
    value = $bindable(""),
    placeholder = "Search",
    label = "Search",
  }: { value?: string; placeholder?: string; label?: string } = $props();
</script>

<label class="search">
  <Icon name="search" size={16} />
  <input type="search" bind:value {placeholder} aria-label={label} />
  <button type="button" class="clear" aria-label="Clear search" hidden={!value} onclick={() => (value = "")}>
    <Icon name="x" size={14} />
  </button>
</label>

<style>
  .search {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    width: min(100%, 20rem);
    height: 2.5rem;
    padding: 0 var(--s-2) 0 var(--s-3);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--field-bg);
    box-shadow: var(--field-edge);
    color: var(--fg-muted);
    transition: background-color var(--t-fast) var(--ease-in-out);
  }
  .search:focus-within {
    border-color: var(--red-border);
    background: var(--field-bg-focus);
  }
  input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    outline: 0;
    background: none;
    color: var(--fg);
    font: inherit;
    font-size: var(--text-sm);
  }
  input::-webkit-search-cancel-button {
    display: none;
  }
  .clear {
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    border: 0;
    border-radius: var(--r-sm);
    background: none;
    color: var(--fg-muted);
  }
  .clear[hidden] {
    display: grid;
    visibility: hidden;
  }
  @media (max-width: 900px) {
    .search {
      width: 100%;
    }
  }
</style>
