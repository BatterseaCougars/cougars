<script lang="ts">
  // Phones: everything that isn't a tab. You, the club, then Settings for admins, grouped People / Money.
  import { can } from "../access/actions";
  import Icon from "../app/shell/Icon.svelte";
  import type { Group, Route } from "../app/nav-routes";
  import { routes } from "../app/routes.svelte";
  import { emailFor } from "../demo/data";
  import { granted, impersonating, me, rolesOf } from "../demo/session.svelte";
  import { initials } from "../lib/initials";

  const perms = $derived(granted());
  const who = $derived(me());
  const visible = (g: Group) => routes().filter((r) => r.group === g && can(perms, r.action));
  const club = $derived(visible("Club"));
  const you = $derived(visible("You"));
  const settings = $derived(
    (["People", "Schedule", "Money"] as const)
      .map((section) => ({ section, routes: visible("Settings").filter((r) => r.section === section) }))
      .filter((s) => s.routes.length),
  );
</script>

{#snippet rows(routes: Route[])}
  <div class="list">
    {#each routes as r (r.id)}
      <a class="row" href={r.path}>
        <span class="glyph"><Icon name={r.icon} /></span>
        <span class="grow"><span class="title">{r.name}</span><span class="sub">{r.hint}</span></span>
        <Icon name="chevronRight" size={18} />
      </a>
    {/each}
  </div>
{/snippet}

<div class="page">
  <a class="me" href="/me">
    <span class="avatar big" class:as={impersonating()}>{initials(who.name)}</span>
    <span class="grow">
      <span class="name">{who.name}</span>
      <span class="hint">{emailFor(who)} · {rolesOf(who.id).join(", ")}</span>
    </span>
    <Icon name="chevronRight" size={18} />
  </a>

  <h2 class="section-title">You</h2>
  {@render rows(you)}

  <h2 class="section-title">Club</h2>
  {@render rows(club)}

  {#if settings.length}
    <div class="settings">
      <h2 class="settings-title"><Icon name="settings" size={16} /> Settings</h2>
      {#each settings as s (s.section)}
        <h3 class="section-title">{s.section}</h3>
        {@render rows(s.routes)}
      {/each}
    </div>
  {/if}

  <p class="hint">Use the badge at the top to switch who you're viewing as, or to sign out.</p>
</div>

<style>
  .me {
    display: flex;
    align-items: center;
    gap: var(--s-4);
    padding: var(--s-2) var(--s-1);
    color: var(--fg-muted);
  }
  .me .grow {
    display: grid;
    flex: 1;
    min-width: 0;
  }
  .name {
    color: var(--fg);
    font-size: var(--text-lg);
    font-weight: 600;
  }
  .avatar.big {
    width: 3.5rem;
    height: 3.5rem;
    font-size: var(--text-md);
    border-color: var(--red-border);
    background: var(--red-wash-strong);
    color: var(--fg);
  }
  .avatar.as {
    border-color: var(--amber-border);
    background: var(--amber-wash);
    color: var(--amber);
  }
  .settings {
    display: grid;
    gap: var(--s-5);
    margin-top: var(--s-3);
    padding-top: var(--s-5);
    border-top: 1px solid var(--border);
  }
  .settings-title {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    color: var(--fg);
    font-size: var(--text-md);
    font-weight: 600;
  }
</style>
