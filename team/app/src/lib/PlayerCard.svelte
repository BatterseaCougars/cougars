<script lang="ts">
  // A player as a trading card: the layout of the website's card (apps/web PlayerCard.astro) — photo slot, number
  // tab, angled red name plate, position sash — made from the app's materials (dark glass, hairlines) instead of
  // cream card stock, so it sits in the app. The photo slot shows the club mark until members add photos.
  // The corner number is the sign-up order. Ratings only show for admins (read:Rating).
  import type { Player } from "../demo/data";
  import mark from "../assets/cougars-mark.webp";

  let {
    player,
    n,
    you = false,
    showRating = false,
  }: { player: Player; n?: number; you?: boolean; showRating?: boolean } = $props();

  const first = $derived(player.name.split(" ")[0]);
</script>

<div class="slot">
  <article class="pc" class:you aria-label={player.name}>
    <span class="photo">
      <img class="ghost" src={mark} alt="" loading="lazy" />
      {#if n !== undefined}<span class="no">{n}</span>{/if}
      <span class="pos">{player.position === "D" ? "Defence" : "Forward"}</span>
    </span>
    <span class="plate"><strong>{first}</strong></span>
    <span class="foot">
      <span>{player.name}</span>
      {#if you}<span class="tag">You</span>{:else if showRating}<span>{player.rating}</span
        >{:else if player.cougar}<span>Cougar</span>{/if}
    </span>
  </article>
</div>

<style>
  .slot {
    container-type: inline-size;
  }
  .pc {
    position: relative;
    display: flex;
    flex-direction: column;
    aspect-ratio: 5 / 7;
    padding: 4cqw 4cqw 3.5cqw;
    overflow: hidden;
    border: 1px solid rgb(236 232 225 / 0.12);
    border-radius: 4cqw;
    color: var(--fg);
    background:
      linear-gradient(165deg, rgb(255 255 255 / 0.08), rgb(255 255 255 / 0.015) 40%, transparent 70%),
      color-mix(in srgb, var(--surface-1) 55%, transparent);
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.09),
      0 14px 28px -12px rgb(0 0 0 / 0.75);
    backdrop-filter: blur(16px) saturate(1.4);
    -webkit-backdrop-filter: blur(16px) saturate(1.4);
  }
  .pc.you {
    border-color: var(--green-border);
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.09),
      0 0 0 1px var(--green-border),
      0 14px 28px -12px rgb(0 0 0 / 0.75);
  }
  .photo {
    position: relative;
    flex: 1;
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: 2.5cqw;
    background:
      radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--red) 30%, transparent), transparent 62%),
      repeating-linear-gradient(135deg, rgb(255 255 255 / 0.03) 0 2px, transparent 2px 5px),
      color-mix(in srgb, var(--bg) 80%, transparent);
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.4);
  }
  .ghost {
    width: 58%;
    height: auto;
    opacity: 0.55;
    filter: grayscale(0.3) drop-shadow(0 6px 14px rgb(0 0 0 / 0.5));
  }
  .no {
    position: absolute;
    top: 0;
    left: 0;
    min-width: 16cqw;
    padding: 1.6cqw 2.4cqw 1.2cqw;
    border-bottom-right-radius: 2.5cqw;
    background: color-mix(in srgb, var(--bg) 70%, transparent);
    color: var(--fg);
    font-family: var(--font-display);
    font-size: 10cqw;
    line-height: 1;
    text-align: center;
  }
  .pos {
    position: absolute;
    top: 4cqw;
    right: -11cqw;
    width: 42cqw;
    padding: 1.1cqw 0;
    rotate: 38deg;
    background: rgb(236 232 225 / 0.14);
    color: var(--fg-muted);
    font-size: 4cqw;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-align: center;
    text-transform: uppercase;
    backdrop-filter: blur(6px);
  }
  .plate {
    position: relative;
    z-index: 1;
    align-self: start;
    max-width: 100%;
    margin: -6cqw 0 0 -4cqw;
    padding: 2.2cqw 7cqw 1.8cqw 5cqw;
    background: var(--red);
    color: #fff;
    clip-path: polygon(0 0, 100% 0, calc(100% - 4cqw) 100%, 0 100%);
  }
  .plate strong {
    display: block;
    font-family: var(--font-display);
    font-size: 14cqw;
    font-weight: 400;
    line-height: 1;
    letter-spacing: 0.01em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .foot {
    display: flex;
    justify-content: space-between;
    gap: 2cqw;
    padding: 3cqw 1cqw 0;
    color: var(--fg-subtle);
    font-size: 4.6cqw;
    font-weight: 600;
    letter-spacing: 0.06em;
    line-height: 1;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .foot span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tag {
    color: var(--green);
  }
</style>
