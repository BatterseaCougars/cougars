import { MediaQuery } from "svelte/reactivity";

/** Phone layout: the shell's breakpoint, the same 900px as every `@media` in the app. */
export const phone = new MediaQuery("max-width: 900px");
