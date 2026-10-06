<script lang="ts">
  import type { Player } from "../demo/data";

  let { player, showRating = false, meta }: { player: Player; showRating?: boolean; meta?: string } = $props();
  const initials = $derived(
    player.name
      .split(" ")
      .map((w) => w[0])
      .join(""),
  );
  const position = $derived(player.position === "D" ? "Defence" : "Forward");
</script>

<span class="avatar">{initials}</span>
<span class="grow">
  <span class="title">{player.name}</span>
  <span class="sub">{meta ?? position}{showRating ? ` · ${player.rating}` : ""}</span>
</span>
