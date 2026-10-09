<script lang="ts">
  import { POSITIONS, type Player } from "../demo/data";
  import { goesBy } from "./names";

  let { player, showRating = false, meta }: { player: Player; showRating?: boolean; meta?: string } = $props();
  const initials = $derived(
    goesBy(player)
      .split(" ")
      .map((w) => w[0])
      .join(""),
  );
  const position = $derived(POSITIONS[player.position]);
</script>

<span class="avatar">{initials}</span>
<span class="grow">
  <span class="title">{goesBy(player)}</span>
  <span class="sub">{meta ?? position}{showRating ? ` · ${player.rating}` : ""}</span>
</span>
