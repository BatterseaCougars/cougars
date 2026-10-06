<script lang="ts">
  import { can } from "../access/actions";
  import Icon from "../app/shell/Icon.svelte";
  import { ROUTES } from "../app/nav-routes";
  import { ME } from "../demo/data";
  import { granted, session, viewAs } from "../demo/session.svelte";
  import { db } from "../demo/store.svelte";

  const perms = $derived(granted());
  const groups = $derived(
    (["Me", "Admin"] as const)
      .map((g) => ({ g, routes: ROUTES.filter((r) => r.group === g && can(perms, r.action)) }))
      .filter((x) => x.routes.length),
  );
  const initials = ME.name
    .split(" ")
    .map((w) => w[0])
    .join("");
</script>

<div class="page">
  <header class="me">
    <span class="avatar big">{initials}</span>
    <div>
      <h1>{ME.name}</h1>
      <p class="hint">alex@example.com · {session.role}</p>
    </div>
  </header>

  {#each groups as { g, routes } (g)}
    <h2 class="section-title">{g}</h2>
    <div class="list">
      {#each routes as r (r.id)}
        <a class="row" href={r.path}>
          <span class="glyph"><Icon name={r.icon} /></span>
          <span class="grow"><span class="title">{r.name}</span><span class="sub">{r.hint}</span></span>
          <Icon name="chevronRight" size={18} />
        </a>
      {/each}
    </div>
  {/each}

  <h2 class="section-title">Demo · view the app as</h2>
  <div class="seg roles" role="group" aria-label="View as role">
    {#each db.roles as role (role.id)}
      <button aria-pressed={session.role === role.name} onclick={() => viewAs(role.name)}>{role.name}</button>
    {/each}
  </div>
  <p class="hint">Real sign-in comes in T1. Pages and buttons follow the role's actions, as they will for real.</p>

  <div class="list">
    <button class="row signout"><Icon name="signOut" /> <span class="grow title">Sign out</span></button>
  </div>
</div>

<style>
  .me {
    display: flex;
    align-items: center;
    gap: var(--s-4);
    padding-bottom: var(--s-2);
  }
  .me h1 {
    font-size: var(--text-lg);
    font-weight: 600;
  }
  .avatar.big {
    width: 3.5rem;
    height: 3.5rem;
    font-size: var(--text-md);
  }
  .roles {
    display: flex;
    flex-wrap: wrap;
  }
  .signout :global(svg),
  .signout .title {
    color: var(--red-hot);
  }
</style>
