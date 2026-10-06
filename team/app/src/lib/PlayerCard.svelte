<script lang="ts">
  // A player as a physical trading card: printed card stock with a border round the photo, a red name plate and
  // the position printed under it, and a shadow as if it's lying on the table. Flat colour, no sheen.
  // The photo slot shows the club mark until members add photos. The corner number is the sign-up order. Ratings
  // only show for admins (read:Rating). With `onopen` it's a button: the page flips it over (PlayerCardZoom), and
  // hides this one meanwhile, as if it's been picked up.
  import { POSITIONS, type Player } from "../demo/data";
  import mark from "../assets/cougars-mark.webp";

  let {
    player,
    n,
    you = false,
    showRating = false,
    onopen,
    lifted = false,
  }: {
    player: Player;
    n?: number;
    you?: boolean;
    showRating?: boolean;
    /** Tapped: given the card, so the zoom can start where it lies. */
    onopen?: (card: HTMLElement) => void;
    /** Picked up (open in the zoom): its place stays, the card doesn't show. */
    lifted?: boolean;
  } = $props();

  const first = $derived(player.name.split(" ")[0]);
</script>

{#snippet card()}
  <article class="pc" class:you aria-label={player.name}>
    <span class="photo">
      <img class="ghost" src={mark} alt="" loading="lazy" />
      {#if n !== undefined}<span class="no">{n}</span>{/if}
    </span>
    <span class="plate"><strong>{first}</strong></span>
    <span class="foot">
      <span class="pos">{POSITIONS[player.position]}</span>
      {#if you}<span class="tag">You</span>{:else if showRating}<span class="num">{player.rating}</span
        >{:else if player.cougar}<span class="cougar">Cougar</span>{/if}
    </span>
  </article>
{/snippet}

{#if onopen}
  <button
    class="slot tap"
    style:visibility={lifted ? "hidden" : undefined}
    aria-haspopup="dialog"
    aria-label="{player.name}: turn the card over"
    onclick={(e) => onopen(e.currentTarget)}>{@render card()}</button
  >
{:else}
  <div class="slot">{@render card()}</div>
{/if}

<style>
  .slot {
    container-type: inline-size;
  }
  .tap {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    text-align: inherit;
  }
  .tap:focus-visible {
    outline: none;
  }
  .tap:focus-visible .pc {
    outline: 2px solid var(--ring);
    outline-offset: 3px;
  }
  /* Card stock: warm off-white, faint grain, small rounded corners, a hairline edge and a table shadow */
  .pc {
    position: relative;
    display: flex;
    flex-direction: column;
    aspect-ratio: 5 / 7;
    padding: 5cqw 5cqw 3.5cqw;
    overflow: hidden;
    border-radius: 3cqw;
    color: #1b1917;
    background: #e7e1d5;
    box-shadow:
      inset 0 0 0 1px rgb(0 0 0 / 0.12),
      0 1px 1px rgb(0 0 0 / 0.35),
      0 8px 18px -6px rgb(0 0 0 / 0.6);
    transition:
      translate var(--t) var(--ease),
      box-shadow var(--t) var(--ease);
  }
  .pc:hover {
    translate: 0 -3px;
    box-shadow:
      inset 0 0 0 1px rgb(0 0 0 / 0.12),
      0 2px 2px rgb(0 0 0 / 0.3),
      0 16px 28px -8px rgb(0 0 0 / 0.65);
  }
  .pc.you {
    box-shadow:
      inset 0 0 0 1px rgb(0 0 0 / 0.12),
      0 0 0 2px var(--green),
      0 8px 18px -6px rgb(0 0 0 / 0.6);
  }
  /* The photo, inset in the stock with a thin printed keyline */
  .photo {
    position: relative;
    flex: 1;
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: 1cqw;
    background: #1c1c21;
    box-shadow: 0 0 0 0.6cqw #1b1917;
  }
  .ghost {
    width: 62%;
    height: auto;
    filter: drop-shadow(0 4px 10px rgb(0 0 0 / 0.5));
  }
  .no {
    position: absolute;
    top: 3cqw;
    left: 3cqw;
    display: grid;
    place-items: center;
    width: 14cqw;
    height: 14cqw;
    border-radius: 50%;
    background: #e7e1d5;
    color: #1b1917;
    font-family: var(--font-display);
    font-size: 8cqw;
    line-height: 1;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.4);
  }
  /* The red plate overlaps the bottom of the photo, as printed */
  .plate {
    position: relative;
    z-index: 1;
    align-self: start;
    max-width: 100%;
    margin: -5.5cqw 0 0 -5cqw;
    padding: 2.2cqw 7cqw 1.8cqw 5cqw;
    background: var(--red);
    color: #fff;
    clip-path: polygon(0 0, 100% 0, calc(100% - 4cqw) 100%, 0 100%);
  }
  .plate strong {
    display: block;
    font-family: var(--font-display);
    font-size: 13cqw;
    font-weight: 400;
    font-style: italic;
    line-height: 1;
    letter-spacing: 0.01em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .foot {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 2cqw;
    padding: 2.6cqw 0.5cqw 0;
    font-size: 4.8cqw;
    font-weight: 700;
    letter-spacing: 0.1em;
    line-height: 1;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .pos {
    color: #5e5850;
  }
  .cougar {
    color: #b3101a;
  }
  .tag {
    color: #1e7a45;
  }
</style>
