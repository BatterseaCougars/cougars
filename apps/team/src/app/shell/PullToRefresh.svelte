<script lang="ts">
  /**
   * Pull to refresh, on a phone. The page scrolls inside the shell, not the document, so the browser's own never
   * starts (and an installed app has none). Pulled down from the top of the page, a disc follows the finger over the
   * page, its arrow turning as it goes; let go past the mark and the club's data is read again (one small check when
   * nothing's changed). The page itself never moves. Not from inside something scrolled down (a table), nor sideways
   * (a strip of pages).
   */
  import { pullToRefresh } from "../backend.svelte";
  import { prefersReducedMotion } from "../motion";
  import Icon from "./Icon.svelte";

  let { content, top = 0 }: { content: HTMLElement | undefined; top?: number } = $props();

  /** How far the disc travels before letting go refreshes, and the most it goes. */
  const MARK = 72;
  const MAX = 104;

  let pull = $state(0);
  let busy = $state(false);
  let dragging = $state(false);

  $effect(() => {
    const el = content;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    // null: not decided yet; false: this touch scrolls the page (or goes sideways)
    let pulling: boolean | null = false;

    /** At the very top, all the way up from where the finger is (a table scrolled down inside the page isn't). */
    const atTop = (target: EventTarget | null) => {
      for (let n = target as HTMLElement | null; n && n !== el; n = n.parentElement) {
        if (n.scrollTop > 0) return false;
      }
      return true;
    };

    const start = (e: TouchEvent) => {
      pulling = !busy && e.touches.length === 1 && atTop(e.target) ? null : false;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const move = (e: TouchEvent) => {
      if (pulling === false) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (pulling === null) {
        // The first few pixels say which way: down and more down than sideways is a pull
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        pulling = dy > 0 && dy > Math.abs(dx);
        if (!pulling) return;
        dragging = true;
      }
      // Harder the further it goes, as a rubber band
      pull = dy <= 0 ? 0 : Math.min(MAX, dy * 0.5);
      if (e.cancelable) e.preventDefault();
    };
    const end = async () => {
      if (!pulling) return;
      pulling = false;
      dragging = false;
      if (pull < MARK) return void (pull = 0);
      busy = true;
      pull = MARK * 0.8;
      // Long enough to see it turn, even when the answer's quick
      await Promise.all([pullToRefresh(), new Promise((r) => setTimeout(r, 450))]);
      busy = false;
      pull = 0;
    };

    el.addEventListener("touchstart", start, { passive: true });
    // Not passive: once it's a pull, the page mustn't scroll as well
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
    };
  });

  const progress = $derived(Math.min(1, pull / MARK));
</script>

<div
  class="pull"
  class:dragging
  class:busy
  class:ready={progress >= 1 && !busy}
  style:top="{top}px"
  style:translate="-50% {pull - 44}px"
  style:opacity={busy ? 1 : progress}
  role="status"
  aria-live="polite"
>
  <span class="disc" style:rotate={busy || prefersReducedMotion ? undefined : `${progress * 270}deg`}>
    <Icon name="refresh" size={20} />
  </span>
  <span class="sr">{busy ? "Refreshing" : ""}</span>
</div>

<style>
  .pull {
    position: absolute;
    left: 50%;
    z-index: 4;
    pointer-events: none;
    transition:
      translate 280ms var(--ease),
      opacity 200ms var(--ease);
  }
  /* Under the finger: no easing, it follows exactly */
  .pull.dragging {
    transition: none;
  }
  .disc {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    background: var(--surface-2);
    box-shadow: var(--shadow-pop);
    color: var(--fg-muted);
  }
  /* Past the mark: letting go will refresh */
  .ready .disc {
    color: var(--red-hot);
  }
  .busy .disc {
    color: var(--red-hot);
    animation: turn 800ms linear infinite;
  }
  @keyframes turn {
    to {
      rotate: 360deg;
    }
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
