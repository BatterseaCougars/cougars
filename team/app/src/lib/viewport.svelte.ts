import { MediaQuery } from "svelte/reactivity";

/** Phone layout: the shell's breakpoint, the same 900px as every `@media` in the app. */
export const phone = new MediaQuery("max-width: 900px");
/** Room beside the page column for a filters aside (PageHeader). */
export const wide = new MediaQuery("min-width: 1200px");
