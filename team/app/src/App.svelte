<script lang="ts">
  import type { Component } from "svelte";
  import { can } from "./access/actions";
  import { granted } from "./demo/session.svelte";
  import { routeFor } from "./app/nav-routes";
  import { interceptLinks, remember, router } from "./app/router.svelte";
  import Shell from "./app/shell/Shell.svelte";
  import Calendar from "./pages/Calendar.svelte";
  import Teammates from "./pages/Teammates.svelte";
  import Draft from "./pages/Draft.svelte";
  import Friday from "./pages/Friday.svelte";
  import Fees from "./pages/Fees.svelte";
  import Game from "./pages/Game.svelte";
  import Home from "./pages/Home.svelte";
  import Kumite from "./pages/Kumite.svelte";
  import Members from "./pages/Members.svelte";
  import More from "./pages/More.svelte";
  import MyTab from "./pages/MyTab.svelte";
  import NotAllowed from "./pages/NotAllowed.svelte";
  import Overdue from "./pages/Overdue.svelte";
  import Profile from "./pages/Profile.svelte";
  import Register from "./pages/Register.svelte";
  import Roles from "./pages/Roles.svelte";
  import Standings from "./pages/Standings.svelte";
  import Upload from "./pages/Upload.svelte";

  const PAGES: Record<string, Component> = {
    home: Home,
    calendar: Calendar,
    friday: Friday,
    register: Register,
    kumite: Kumite,
    standings: Standings,
    draft: Draft,
    game: Game,
    teammates: Teammates,
    upload: Upload,
    more: More,
    profile: Profile,
    tab: MyTab,
    members: Members,
    roles: Roles,
    fees: Fees,
    overdue: Overdue,
  };

  const route = $derived(routeFor(router.path) ?? routeFor("/")!);
  const allowed = $derived(can(granted(), route.action));
  const Page = $derived(allowed ? PAGES[route.id] : NotAllowed);

  $effect(() => {
    if (!route.focus) remember(route.tab, route.path);
    document.title = route.id === "home" ? "Cougars" : `${route.name} · Cougars`;
  });
</script>

<svelte:document onclick={interceptLinks} />

<Shell {route}>
  <Page />
</Shell>
