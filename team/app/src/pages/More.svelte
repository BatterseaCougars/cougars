<script lang="ts">
  // Phones: everything that isn't a tab. You, the club, then Settings for admins, grouped People / Schedule / Money / Club.
  import { can } from "../access/actions";
  import AccountMenu from "../app/shell/AccountMenu.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import type { Group, Route } from "../app/nav-routes";
  import { routes } from "../app/routes.svelte";
  import { granted } from "../demo/session.svelte";

  const perms = $derived(granted());
  const visible = (g: Group) => routes().filter((r) => r.group === g && can(perms, r.action));
  const club = $derived(visible("Club"));
  const you = $derived(visible("You"));
  const settings = $derived(
    (["People", "Schedule", "Money", "Club"] as const)
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
  <!-- You: opens your account (profile, dues, View as, sign out) -->
  <AccountMenu card />

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
</div>

<style>
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
