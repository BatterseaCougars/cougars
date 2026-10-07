<script lang="ts">
  // The club's free Cloudflare allowance today (ADR 0059): one account runs the website, this app and their
  // database, and its daily limits reset at midnight UTC. If one runs out, this app stops until then; the hourly
  // check emails the admins at 80%. Each Worker's CPU time per request is shown against the free plan's 10 ms, past
  // which Cloudflare stops the request (ADR 0063). Read when the page opens, and again on Refresh.
  import { api } from "../app/api";
  import Icon from "../app/shell/Icon.svelte";
  import PageHeader from "../lib/PageHeader.svelte";

  interface Metric {
    id: string;
    label: string;
    used: number;
    limit: number;
  }
  interface WorkerCpu {
    name: string;
    p50Ms: number;
    p99Ms: number;
    stopped: number;
  }
  interface Usage {
    configured: boolean;
    unavailable?: boolean;
    day: string;
    resetsAt: string;
    metrics: Metric[];
    cpu?: { limitMs: number; workers: WorkerCpu[] };
  }

  const ABOUT: Record<string, string> = {
    requests: "Every time this app talks to the server. The website's pages are free and don't count.",
    rowsRead: "Rows the app and the website's live pages read from the club's database.",
    rowsWritten: "Sign-ups, picks, saves: every change made.",
  };

  let usage = $state<Usage | null>(null);
  let error = $state("");
  let loading = $state(false);
  async function load() {
    loading = true;
    error = "";
    try {
      usage = await api<Usage>("GET", "/api/usage");
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }
  $effect(() => {
    load();
  });

  const pct = (m: Metric) => Math.min(100, Math.round((m.used / m.limit) * 100));
  const level = (m: Metric) => (pct(m) >= 80 ? "high" : pct(m) >= 50 ? "mid" : "low");
  const n = (x: number) => x.toLocaleString("en-GB");
  const cpuPct = (w: WorkerCpu, limit: number) => Math.min(100, Math.round((w.p99Ms / limit) * 100));
  const cpuLevel = (w: WorkerCpu, limit: number) =>
    w.stopped || w.p99Ms >= limit * 0.8 ? "high" : w.p99Ms >= limit * 0.5 ? "mid" : "low";
  const resets = $derived(
    usage
      ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(
          new Date(usage.resetsAt),
        )
      : "",
  );
</script>

<div class="page">
  <PageHeader title="Usage" subtitle="The club runs on Cloudflare's free plan. Today's use, against its daily limits.">
    {#snippet actions()}
      <button class="btn sm" onclick={load} disabled={loading}><Icon name="undo" size={16} />Refresh</button>
    {/snippet}
  </PageHeader>

  {#if error}
    <p class="error">{error}</p>
  {:else if !usage}
    <p class="hint">Reading Cloudflare…</p>
  {:else if !usage.configured}
    <div class="panel pad note">
      <p><strong>Not set up yet.</strong></p>
      <p class="hint">
        The page reads Cloudflare's analytics with a read-only token. Create one in Cloudflare (Account Analytics:
        Read), and store it in Secrets Manager as <code>CLOUDFLARE_ANALYTICS_TOKEN</code> (README, Secrets).
      </p>
    </div>
  {:else if usage.unavailable}
    <p class="hint">Cloudflare's analytics can't be read right now. Try Refresh in a minute.</p>
  {:else}
    <div class="meters">
      {#each usage.metrics as m, i (m.id)}
        <section class="meter rise" style:animation-delay="{i * 60}ms">
          <div class="top">
            <h2>{m.label}</h2>
            <span class="pct num {level(m)}">{pct(m)}%</span>
          </div>
          <div
            class="bar"
            role="meter"
            aria-label={m.label}
            aria-valuemin={0}
            aria-valuemax={m.limit}
            aria-valuenow={m.used}
          >
            <span class="fill {level(m)}" style:width="{pct(m)}%"></span>
          </div>
          <p class="num">{n(m.used)} <span class="hint">of {n(m.limit)}</span></p>
          <p class="hint small">{ABOUT[m.id]}</p>
        </section>
      {/each}
    </div>
    {#if usage.cpu?.workers.length}
      {@const limit = usage.cpu.limitMs}
      <h2 class="section">CPU time per request</h2>
      <p class="hint small">
        Cloudflare stops a request that computes for more than {limit} ms. Waiting for the database or another service doesn't
        count.
      </p>
      <div class="meters">
        {#each usage.cpu.workers as w (w.name)}
          <section class="meter">
            <div class="top">
              <h2>{w.name}</h2>
              <span class="pct num {cpuLevel(w, limit)}">{w.p99Ms} ms</span>
            </div>
            <div
              class="bar"
              role="meter"
              aria-label="{w.name}, slowest CPU time"
              aria-valuemin={0}
              aria-valuemax={limit}
              aria-valuenow={w.p99Ms}
            >
              <span class="fill {cpuLevel(w, limit)}" style:width="{cpuPct(w, limit)}%"></span>
            </div>
            <p class="num">{w.p50Ms} ms <span class="hint">typical, {w.p99Ms} ms slowest 1 in 100</span></p>
            {#if w.stopped}
              <p class="high small">{n(w.stopped)} stopped today for going over {limit} ms</p>
            {/if}
          </section>
        {/each}
      </div>
    {/if}
    <p class="hint">
      Resets at {resets} (midnight UTC). If anything reaches its limit, this app stops working until then; the admins get
      an email at 80%. Sanity's allowance is on sanity.io/manage.
    </p>
  {/if}
</div>

<style>
  .meters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: var(--s-3);
    margin-bottom: var(--s-4);
  }
  .meter {
    display: grid;
    gap: var(--s-2);
    padding: var(--s-4);
    border-radius: var(--r-lg);
    background: var(--surface-1);
  }
  .top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }
  h2 {
    margin: 0;
    font-size: var(--text-sm);
    font-weight: 600;
  }
  .pct {
    font-size: 1.5rem;
    font-weight: 700;
  }
  .bar {
    height: 0.5rem;
    overflow: hidden;
    border-radius: 999px;
    background: var(--surface-2);
  }
  .fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    transition: width var(--t-slow) var(--ease);
  }
  .low {
    color: var(--green-ink);
  }
  .fill.low {
    background: var(--green);
  }
  .mid {
    color: var(--amber-ink);
  }
  .fill.mid {
    background: var(--amber);
  }
  .high {
    color: var(--red-hot);
  }
  .fill.high {
    background: var(--red-hot);
  }
  p {
    margin: 0;
  }
  .section {
    margin-bottom: var(--s-1);
    font-size: var(--text-md);
  }
  .note {
    display: grid;
    gap: var(--s-2);
  }
  .error {
    color: var(--red-hot);
  }
</style>
