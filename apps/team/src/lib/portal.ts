// Moves an overlay (a drawer, an editor panel, a zoomed card) out to <body>. Inside the view, the page is its own
// stacking context (Shell: .view > .page has a z-index), so a fixed layer's z-index only counts within the page, and
// the desktop dock and corners would sit on top of its scrim; a transform there would trap it too. Inside a native
// modal (lib/Sheet's <dialog>, in the top layer, with everything else inert) it moves to the dialog instead, or it
// would open behind it.
export function portal(node: HTMLElement) {
  (node.parentElement?.closest("dialog") ?? document.body).append(node);
  return { destroy: () => node.remove() };
}
