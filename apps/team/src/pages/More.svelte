<script lang="ts">
  // Everything that isn't in the dock, for members with nothing to set up (a desktop's Settings opens its first page
  // instead). Phones list these under your profile, the avatar tab.
  import AccountMenu from "../app/shell/AccountMenu.svelte";
  import MoreLinks from "../lib/MoreLinks.svelte";
</script>

<div class="page">
  <!-- You: opens your account (profile, dues, View as, sign out) -->
  <AccountMenu card />
  <MoreLinks />
</div>
