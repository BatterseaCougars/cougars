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
  import MemberProfile from "./pages/MemberProfile.svelte";
  import Members from "./pages/Members.svelte";
  import More from "./pages/More.svelte";
  import MyTab from "./pages/MyTab.svelte";
  import NotAllowed from "./pages/NotAllowed.svelte";
  import Overdue from "./pages/Overdue.svelte";
  import Profile from "./pages/Profile.svelte";
  import Quips from "./pages/Quips.svelte";
  import Roles from "./pages/Roles.svelte";
  import Standings from "./pages/Standings.svelte";
  import Teammates from "./pages/Teammates.svelte";
  import TournamentSettings from "./pages/TournamentSettings.svelte";
  import Training from "./pages/Training.svelte";
  import TrainingEditor from "./pages/TrainingEditor.svelte";
  import TrainingSettings from "./pages/TrainingSettings.svelte";
  import Upload from "./pages/Upload.svelte";

  // Page components by route.page; a route's params (seriesId, typeId) are passed as props. Pages take different
  // props, so the map is loosely typed; nav-routes.ts is what pairs each page with its params.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PAGES: Record<string, Component<any>> = {
    home: Home,
    calendar: Calendar,
    training: Training,
    games: Games,
    standings: Standings,
    draft: Draft,
    game: Game,
    teammates: Teammates,
    upload: Upload,
    more: More,
    profile: Profile,
    tab: MyTab,
    members: Members,
    member: MemberProfile,
    roles: Roles,
    "training-settings": TrainingSettings,
    "training-editor": TrainingEditor,
    "tournament-settings": TournamentSettings,
    fees: Fees,
    overdue: Overdue,
    quips: Quips,
  };

  const all = $derived(routes());
  const route = $derived(routeFor(all, router.path) ?? routeFor(all, "/")!);
  const allowed = $derived(can(granted(), route.action));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Page: Component<any> = $derived(allowed ? PAGES[route.page] : NotAllowed);

  $effect(() => {
    if (!route.focus && !route.hidden) remember(route.tab, route.path);
    document.title = route.id === "home" ? "Cougars Fresh Meat" : `${route.name} · Cougars Fresh Meat`;
  });
</script>

<svelte:document onclick={interceptLinks} />

<Shell {route}>
  <Page {...route.params ?? {}} />
</Shell>
