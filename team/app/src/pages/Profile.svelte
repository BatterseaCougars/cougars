<script lang="ts">
  import BackLink from "../lib/BackLink.svelte";
  import { ME } from "../demo/data";

  let me = $state({ name: ME.name, email: "alex@example.com", phone: "07700 900000", position: ME.position });
</script>

<div class="page">
  <BackLink />
  <div class="page-head"><h1>Profile</h1></div>
  <form class="form" onsubmit={(e) => e.preventDefault()}>
    <label class="field">Name <input class="input" bind:value={me.name} /></label>
    <label class="field">Email <input class="input" type="email" bind:value={me.email} /></label>
    <label class="field">Phone <input class="input" type="tel" bind:value={me.phone} /></label>
    <label class="field">
      Position
      <select class="input" bind:value={me.position}>
        <option value="F">Forward</option>
        <option value="D">Defence</option>
      </select>
    </label>
    <button class="btn primary">Save</button>
  </form>
</div>
