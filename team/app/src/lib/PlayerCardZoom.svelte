<script lang="ts">
  // A player's card, picked up: it lifts from where it lies, turns over sideways and comes up to the middle of the
  // screen, showing its back: who they are, their number tonight, and a line or two about them. Closing puts it
  // back the same way. Someone who runs events can take the player off the session from here (two taps, so a
  // stray one can't). Without motion it just appears.
  import { onMount } from "svelte";
  import { POSITIONS, type Player } from "../demo/data";
  import mark from "../assets/cougars-mark.webp";
  import { prefersReducedMotion } from "../app/motion";
  import PlayerCard from "./PlayerCard.svelte";
  import { initials } from "./initials";

  let {
    player,
    source,
    n,
    you = false,
    showRating = false,
    bio = "",
    removeLabel,
    onremove,
    onclose,
  }: {
    player: Player;
    /** The card on the page, where this one starts and ends. */
    source: HTMLElement;
    n?: number;
    you?: boolean;
    showRating?: boolean;
    bio?: string;
    /** "Remove from Friday", when the viewer may. */
    removeLabel?: string;
    onremove?: () => void;
    onclose: () => void;
  } = $props();

  let flipper = $state<HTMLElement | undefined>();
  let closeBtn = $state<HTMLButtonElement | undefined>();
  let closing = $state(false);
  let sure = $state(false);
  const first = $derived(player.name.split(" ")[0]);
  const DURATION = 520;
  const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

  // Leave the page for <body>: inside the view, a transform would trap a fixed layer
  function portal(node: HTMLElement) {
    document.body.append(node);
    return { destroy: () => node.remove() };
  }

  // Where the page's card is, as a transform from the zoomed card's own place
  function fromSource(el: HTMLElement) {
    const a = source.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const dx = a.left + a.width / 2 - (b.left + b.width / 2);
    const dy = a.top + a.height / 2 - (b.top + b.height / 2);
    return `translate(${dx}px, ${dy}px) scale(${a.width / b.width}) rotateY(0deg)`;
  }

  onMount(() => {
    closeBtn?.focus({ preventScroll: true });
    if (!flipper || prefersReducedMotion) return;
    flipper.animate([{ transform: fromSource(flipper) }, { transform: "rotateY(180deg)" }], {
      duration: DURATION,
      easing: EASE,
    });
  });

  function close() {
    if (closing) return;
    closing = true;
    if (!flipper || prefersReducedMotion) return onclose();
    const back = flipper.animate([{ transform: "rotateY(180deg)" }, { transform: fromSource(flipper) }], {
      duration: DURATION - 80,
      easing: EASE,
      fill: "forwards",
    });
    back.onfinish = () => onclose();
  }

  function remove() {
    if (!sure) {
      sure = true;
      return;
    }
    onremove?.();
    close();
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }
</script>

<svelte:window {onkeydown} />

<div class="zoom" class:closing use:portal>
  <button class="scrim" aria-label="Close" tabindex="-1" onclick={close}></button>
  <div class="stage" role="dialog" aria-modal="true" aria-label={player.name}>
    <div class="flipper" bind:this={flipper}>
      <div class="face front" aria-hidden="true"><PlayerCard {player} {n} {you} {showRating} /></div>
      <div class="face back">
        <article class="cb">
          <header class="band">
            <img src={mark} alt="" width="40" height="40" />
            <span>Battersea Cougars</span>
          </header>
          <div class="who">
            <span class="avatar">{initials(player.name)}</span>
            <div>
              <h2>{player.name}</h2>
              <p class="pos">
                {POSITIONS[player.position]}{#if player.cougar}<span class="cougar"> · Cougar</span>{/if}
              </p>
            </div>
          </div>
          <dl class="stats">
            {#if n !== undefined}<div>
                <dt>Tonight</dt>
                <dd class="num">No. {n}</dd>
              </div>{/if}
            {#if showRating}<div>
                <dt>Rating</dt>
                <dd class="num">{player.rating}</dd>
              </div>{/if}
            <div>
              <dt>Position</dt>
              <dd>{player.position}</dd>
            </div>
          </dl>
          <p class="bio" class:empty={!bio.trim()}>
            {bio.trim() || (you ? "No bio yet. Add one on your profile." : `No bio yet. ${first} is a mystery.`)}
          </p>
        </article>
      </div>
    </div>

    <div class="actions">
      {#if removeLabel && onremove}
        <!-- One width for both words, so the second tap lands where the first did -->
        <button class="btn remove" class:sure onclick={remove}>
          <span class:hide={sure}>{removeLabel}</span>
          <span class:hide={!sure}>Sure? Take {first} off</span>
        </button>
      {/if}
      <button class="btn outline" bind:this={closeBtn} onclick={close}>Close</button>
    </div>
  </div>
</div>

<style>
  .zoom {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: grid;
    place-items: center;
    padding: var(--s-5);
  }
  .scrim {
    position: absolute;
    inset: 0;
    border: 0;
    padding: 0;
    background: color-mix(in srgb, var(--bg) 72%, transparent);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    animation: fade-in 260ms var(--ease) both;
  }
  .closing .scrim {
    animation: fade-out 380ms var(--ease) both;
  }
  .closing .actions {
    opacity: 0;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }
  @keyframes fade-out {
    to {
      opacity: 0;
    }
  }
  .stage {
    position: relative;
    display: grid;
    justify-items: center;
    gap: var(--s-5);
    width: min(19rem, 78vw, 52svh);
    perspective: 1600px;
  }
  /* Both faces in one turning card: the front faces you first, the back once it has turned */
  .flipper {
    position: relative;
    width: 100%;
    transform-style: preserve-3d;
    transform: rotateY(180deg);
  }
  .face {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
  .face.front :global(.pc) {
    box-shadow:
      inset 0 0 0 1px rgb(0 0 0 / 0.12),
      0 30px 60px -20px rgb(0 0 0 / 0.8);
  }
  .face.back {
    position: absolute;
    inset: 0;
    container-type: inline-size;
    transform: rotateY(180deg);
  }

  /* The back: the same card stock, printed in the club's colours */
  .cb {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    border-radius: 3cqw;
    color: #1b1917;
    background:
      radial-gradient(130% 80% at 85% 0%, rgb(255 255 255 / 0.5), transparent 60%),
      repeating-linear-gradient(90deg, rgb(0 0 0 / 0.012) 0 1px, transparent 1px 3px), #e7e1d5;
    box-shadow:
      inset 0 0 0 1px rgb(0 0 0 / 0.12),
      0 30px 60px -20px rgb(0 0 0 / 0.8);
  }
  .band {
    display: flex;
    align-items: center;
    gap: 3cqw;
    padding: 4cqw 5cqw;
    background: linear-gradient(180deg, #24242a, #121215);
    color: #e7e1d5;
    font-family: var(--font-display);
    font-size: 6.5cqw;
    font-style: italic;
    text-transform: uppercase;
  }
  .band img {
    width: 11cqw;
    height: auto;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 4cqw;
    padding: 5cqw 5cqw 3cqw;
  }
  .avatar {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 20cqw;
    height: 20cqw;
    border-radius: 50%;
    background: var(--red);
    color: #fff;
    font-family: var(--font-display);
    font-size: 9cqw;
    font-style: italic;
  }
  h2 {
    font-family: var(--font-display);
    font-size: 8.5cqw;
    font-style: italic;
    font-weight: 400;
    line-height: 1;
    text-transform: uppercase;
  }
  .pos {
    margin-top: 1.5cqw;
    color: #5e5850;
    font-size: 4.4cqw;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .cougar {
    color: #b3101a;
  }
  .stats {
    display: flex;
    gap: 2cqw;
    margin: 0 5cqw;
    padding: 3cqw 0;
    border-block: 0.5cqw solid #1b1917;
  }
  .stats div {
    flex: 1;
  }
  dt {
    color: #5e5850;
    font-size: 3.6cqw;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  dd {
    margin: 0.5cqw 0 0;
    font-family: var(--font-display);
    font-size: 7cqw;
  }
  .bio {
    flex: 1;
    margin: 0;
    padding: 4cqw 5cqw 5cqw;
    overflow: hidden;
    font-size: 4.8cqw;
    line-height: 1.4;
  }
  .bio.empty {
    color: #7a746b;
    font-style: italic;
  }

  .actions {
    display: flex;
    gap: var(--s-2);
    transition: opacity 200ms var(--ease);
    animation: fade-in 300ms 260ms var(--ease) both;
  }
  .remove {
    display: grid;
    background: var(--red-wash);
    color: var(--red-hot);
  }
  .remove:hover {
    background: var(--red-wash-strong);
  }
  .remove.sure {
    background: var(--red);
    color: #fff;
  }
  /* Both labels share one cell, so the button is as wide as the longer */
  .remove > span {
    grid-area: 1 / 1;
  }
  .remove > .hide {
    visibility: hidden;
  }
</style>
