// The live route tree: rebuilt whenever an admin adds, renames or pauses a training or tournament type.
import { db } from "../demo/store.svelte";
import { buildFolds, buildRoutes, buildTabs, type NavConfig } from "./nav-routes";

const config = (): NavConfig => ({ series: db.series, types: db.tournamentTypes });

export const routes = () => buildRoutes(config());
export const tabs = () => buildTabs(config());
export const folds = () => buildFolds(config());
