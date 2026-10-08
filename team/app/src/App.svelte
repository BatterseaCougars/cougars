<script lang="ts">
  import type { Component } from "svelte";
  import { can } from "./access/actions";
  import { granted } from "./demo/session.svelte";
  import { routeFor } from "./app/nav-routes";
  import { routes } from "./app/routes.svelte";
  import { interceptLinks, remember, router } from "./app/router.svelte";
  import Shell from "./app/shell/Shell.svelte";
  import Calendar from "./pages/Calendar.svelte";
  import Draft from "./pages/Draft.svelte";
  import Fees from "./pages/Fees.svelte";
  import Game from "./pages/Game.svelte";
  import Games from "./pages/Games.svelte";
  import Home from "./pages/Home.svelte";
  import More from "./pages/More.svelte";
  import MyTab from "./pages/MyTab.svelte";
  import NotAllowed from "./pages/NotAllowed.svelte";
  import Overdue from "./pages/Overdue.svelte";
  import Profile from "./pages/Profile.svelte";
  import Quips from "./pages/Quips.svelte";
  import Roles from "./pages/Roles.svelte";
  import Usage from "./pages/Usage.svelte";
  import Standings from "./pages/Standings.svelte";
  import Teammates from "./pages/Teammates.svelte";
  import TournamentSeries from "./pages/TournamentSeries.svelte";
  import TournamentSettings from "./pages/TournamentSettings.svelte";
  import TournamentTeams from "./pages/TournamentTeams.svelte";
  import Schedule from "./pages/Schedule.svelte";
  import TournamentTeam from "./pages/TournamentTeam.svelte";
  import Training from "./pages/Training.svelte";
  import History from "./pages/History.svelte";
  import Edition from "./pages/Edition.svelte";
  import TrainingSettings from "./pages/TrainingSettings.svelte";
  import Upload from "./pages/Upload.svelte";
  import Venues from "./pages/Venues.svelte";

  // Page components by route.page; a route's params (seriesId, typeId) are passed as props. Pages take different
  // props, so the map is loosely typed; nav-routes.ts is what pairs each page with its params.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PAGES: Record<string, Component<any>> = {
    home: Home,
    calendar: Calendar,
    training: Training,
    games: Games,
    schedule: Schedule,
    standings: Standings,
    "tournament-teams": TournamentTeams,
    "tournament-team": TournamentTeam,
    draft: Draft,
    history: History,
    edition: Edition,
    game: Game,
    teammates: Teammates,
    upload: Upload,
    more: More,
    profile: Profile,
    tab: MyTab,
    roles: Roles,
    usage: Usage,
    "training-settings": TrainingSettings,
    "tournament-settings": TournamentSettings,
    "tournament-series": TournamentSeries,
    venues: Venues,
    fees: Fees,
    overdue: Overdue,
    quips: Quips,
  };

  const all = $derived(routes());
  const route = $derived(routeFor(all, router.path) ?? routeFor(all, "/")!);
  const allowed = $derived(can(granted(), route.action));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Page: Component<any> = $derived(allowed ? PAGES[route.page] : NotAllowed);

  // The page's params, the same object until one actually changes. Every save rebuilds the routes (members are in
  // them), and a new object each time would re-run a page's effects on its params: the member page reloaded its
  // attendance and flickered.
  const paramsKey = $derived(JSON.stringify(route.params ?? {}));
  const params = $derived(JSON.parse(paramsKey) as Record<string, unknown>);

  $effect(() => {
    if (!route.focus && !route.hidden) remember(route.tab, route.path);
    document.title = route.id === "home" ? "Cougars Fresh Meat" : `${route.name} · Cougars Fresh Meat`;
  });
</script>

<svelte:document onclick={interceptLinks} />

<Shell {route}>
  <Page {...params} />
</Shell>
