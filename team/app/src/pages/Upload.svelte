<script lang="ts">
  import { can } from "../access/actions";
  import { granted } from "../demo/session.svelte";
  import Icon from "../app/shell/Icon.svelte";

  const perms = $derived(granted());
  let files = $state<{ name: string; url: string; video: boolean }[]>([]);
  let album = $state("Friday hockey");

  function pick(e: Event) {
    const list = (e.currentTarget as HTMLInputElement).files ?? [];
    files = [
      ...files,
      ...[...list].map((f) => ({ name: f.name, url: URL.createObjectURL(f), video: f.type.startsWith("video/") })),
    ];
  }
</script>

<div class="page">
  <div class="page-head">
    <div>
      <h1>Upload</h1>
      <p class="hint">
        Photos go to a website album. Videos go to the club YouTube channel, unlisted until an admin publishes.
      </p>
    </div>
  </div>
  <label class="drop">
    <span class="mark"><Icon name="upload" /></span>
    <span class="title">Add photos{can(perms, "upload:Video") ? " or videos" : ""}</span>
    <span class="hint">Tap to choose from your phone</span>
    <input type="file" multiple accept={can(perms, "upload:Video") ? "image/*,video/*" : "image/*"} onchange={pick} />
  </label>

  {#if files.length}
    <label class="field rise">Album <input class="input" bind:value={album} /></label>
    <div class="grid rise">
      {#each files as f (f.url)}
        <figure>
          {#if f.video}<video src={f.url} muted></video>{:else}<img src={f.url} alt={f.name} />{/if}
          <figcaption class="hint">{f.video ? "→ YouTube" : `→ ${album}`}</figcaption>
        </figure>
      {/each}
    </div>
    <button class="btn primary block" disabled>Upload {files.length} (arrives in T7)</button>
  {/if}
</div>

<style>
  .drop {
    display: grid;
    justify-items: center;
    gap: var(--s-1);
    padding: var(--s-10) var(--s-4);
    border: 1px dashed var(--border-strong);
    border-radius: var(--r-lg);
    background: color-mix(in srgb, var(--surface-1) 40%, transparent);
    text-align: center;
    cursor: pointer;
    transition:
      border-color var(--t) var(--ease-in-out),
      background-color var(--t) var(--ease-in-out);
  }
  .drop:hover {
    border-color: var(--red-border);
    background: var(--red-wash);
  }
  .drop input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
  .mark {
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    margin-bottom: var(--s-2);
    border-radius: 50%;
    background: var(--red-wash);
    color: var(--red-hot);
  }
  .title {
    color: var(--fg);
    font-weight: 500;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
    gap: var(--s-2);
  }
  figure {
    margin: 0;
  }
  img,
  video {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: var(--r-md);
    background: var(--surface-1);
  }
</style>
