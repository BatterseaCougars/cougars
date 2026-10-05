// Overlay scrollbar (technique from gwenda-hackney/ark scrollbar.js): native
// scrollbars are hidden in CSS; this thin rail floats over the content so it
// takes no layout gutter, fades in while scrolling/hovering, and can be dragged.
// The rail element lives in Base.astro with transition:persist so it survives
// page swaps. Touch devices keep their native overlay scrollbars.

const HIDE_AFTER = 1400;

function init() {
  const rail = document.querySelector<HTMLElement>("[data-scrollbar]");
  const thumb = rail?.querySelector<HTMLElement>("[data-scrollbar-thumb]");
  if (!rail || !thumb || rail.dataset.ready) return;
  rail.dataset.ready = "";
  const doc = document.documentElement;
  let hideTimer = 0;
  let dragging = false;
  let dragOffset = 0;
  let raf = 0;

  const metrics = () => {
    const track = rail.clientHeight;
    const max = doc.scrollHeight - innerHeight;
    const size = Math.max(32, (innerHeight / doc.scrollHeight) * track);
    return { track, max, size };
  };

  const paint = () => {
    raf = 0;
    const { track, max, size } = metrics();
    rail.hidden = max <= 0;
    thumb.style.height = `${size}px`;
    thumb.style.transform = `translate3d(0, ${max > 0 ? (scrollY / max) * (track - size) : 0}px, 0)`;
  };

  const show = () => {
    rail.classList.add("is-visible");
    clearTimeout(hideTimer);
    if (!dragging) hideTimer = window.setTimeout(() => rail.classList.remove("is-visible"), HIDE_AFTER);
  };

  const scrollToThumb = (clientY: number) => {
    const { track, max, size } = metrics();
    const top = Math.min(track - size, Math.max(0, clientY - rail.getBoundingClientRect().top - dragOffset));
    doc.classList.add("is-scrollbar-dragging"); // disables smooth scroll while dragging
    scrollTo(0, (top / (track - size)) * max);
  };

  addEventListener(
    "scroll",
    () => {
      raf ||= requestAnimationFrame(paint);
      show();
    },
    { passive: true },
  );
  addEventListener("resize", () => (raf ||= requestAnimationFrame(paint)));
  new ResizeObserver(() => (raf ||= requestAnimationFrame(paint))).observe(document.body);
  rail.addEventListener("pointerenter", show);

  rail.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    dragging = true;
    rail.classList.add("is-dragging");
    rail.setPointerCapture(e.pointerId);
    const t = thumb.getBoundingClientRect();
    // Grab the thumb where it was clicked; clicking the track centres the thumb there.
    dragOffset = e.target === thumb ? e.clientY - t.top : t.height / 2;
    scrollToThumb(e.clientY);
  });
  rail.addEventListener("pointermove", (e) => dragging && scrollToThumb(e.clientY));
  const end = () => {
    dragging = false;
    rail.classList.remove("is-dragging");
    doc.classList.remove("is-scrollbar-dragging");
    show();
  };
  rail.addEventListener("pointerup", end);
  rail.addEventListener("pointercancel", end);

  // Hide during page transitions, repaint for the new page.
  document.addEventListener("astro:before-preparation", () => rail.classList.remove("is-visible"));
  document.addEventListener("astro:page-load", paint);
  paint();
}

if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
  const mark = () => document.documentElement.classList.add("has-overlay-scrollbar");
  mark();
  // Page swaps replace <html> attributes.
  document.addEventListener("astro:after-swap", mark);
  document.addEventListener("astro:page-load", init);
}
