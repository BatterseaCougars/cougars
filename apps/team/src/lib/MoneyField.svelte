<script lang="ts">
  // An amount in pounds, with a button to clear it: no selecting the old figure to type over it (a drag that can end
  // outside the sheet). The clear button keeps its place empty or not, so nothing moves.
  import Icon from "../app/shell/Icon.svelte";

  let {
    value = $bindable(""),
    id,
    required = false,
    "aria-label": ariaLabel,
  }: { value?: string; id?: string; required?: boolean; "aria-label"?: string } = $props();

  let input = $state<HTMLInputElement | undefined>();
</script>

<span class="money">
  <span class="sign" aria-hidden="true">£</span>
  <input
    bind:this={input}
    class="input num"
    {id}
    inputmode="decimal"
    autocomplete="off"
    {required}
    aria-label={ariaLabel}
    bind:value
  />
  <button
    type="button"
    class="clear"
    aria-label="Clear the amount"
    hidden={!value}
    onclick={() => {
      value = "";
      input?.focus();
    }}
  >
    <Icon name="x" size={14} />
  </button>
</span>

<style>
  .money {
    position: relative;
    display: block;
  }
  .sign {
    position: absolute;
    left: var(--s-3);
    top: 50%;
    translate: 0 -50%;
    color: var(--fg-muted);
    pointer-events: none;
  }
  .input {
    width: 100%;
    padding-left: calc(var(--s-3) + 1ch + var(--s-1));
    padding-right: 2.75rem;
  }
  .clear {
    position: absolute;
    right: var(--s-1);
    top: 50%;
    translate: 0 -50%;
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: var(--r-sm);
    background: none;
    color: var(--fg-muted);
  }
  .clear:hover {
    color: var(--fg);
  }
  .clear[hidden] {
    display: grid;
    visibility: hidden;
  }
</style>
