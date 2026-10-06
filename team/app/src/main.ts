import "./app.css";
import { getBootstrap } from "./app/api";
import { hydrate } from "./demo/data";

// The club's data comes first: the store and the app's modules read it as they load, so they're imported only
// after it's in place. Nothing above may import the store.
const target = document.getElementById("app")!;
try {
  hydrate(await getBootstrap());
  const [{ mount }, { default: App }] = await Promise.all([import("svelte"), import("./App.svelte")]);
  mount(App, { target });
} catch (e) {
  target.innerHTML = `<div class="boot-error"><p class="display">Can't reach the club's data</p><p class="hint"></p></div>`;
  target.querySelector(".hint")!.textContent = e instanceof Error ? e.message : String(e);
}

// Only built copies register the service worker; in dev it would serve stale modules.
if (import.meta.env.PROD && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
