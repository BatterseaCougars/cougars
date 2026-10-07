import "./app.css";
import { ApiError, getBootstrap, running } from "./app/api";
import { hydrate } from "./demo/data";

// The club's data comes first: the store and the app's modules read it as they load, so they're imported only
// after it's in place. Nothing above may import the store. Nobody signed in: the sign-in screen, which reloads the
// page once they are.
const target = document.getElementById("app")!;
try {
  hydrate(await getBootstrap());
  const [{ mount }, { default: App }] = await Promise.all([import("svelte"), import("./App.svelte")]);
  mount(App, { target });
  running.app = true;
} catch (e) {
  if (e instanceof ApiError && e.status === 401) {
    const [{ mount }, { default: SignIn }] = await Promise.all([import("svelte"), import("./pages/SignIn.svelte")]);
    mount(SignIn, { target });
  } else showError(e);
}

function showError(e: unknown) {
  // Resting (the day's free allowance is used up, ADR 0058) isn't broken: say when it's back
  const title = e instanceof ApiError && e.status === 429 ? "Back soon" : "Can't reach the club's data";
  target.innerHTML = `<div class="boot-error"><p class="display"></p><p class="hint"></p></div>`;
  target.querySelector(".display")!.textContent = title;
  target.querySelector(".hint")!.textContent = e instanceof Error ? e.message : String(e);
}

// Only built copies register the service worker; in dev it would serve stale modules.
if (import.meta.env.PROD && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
