<script lang="ts" generics="T">
  // A data grid (AG Grid Community, MIT): sortable, resizable columns, a quick filter, row clicks. Loaded only
  // when one is shown, so pages without a grid don't download it. Themed from the app's tokens, dark only.
  import type { ColDef, GridApi } from "ag-grid-community";

  let {
    rows,
    columns,
    filter = "",
    rowId,
    onrowclick,
  }: {
    rows: T[];
    columns: ColDef<T>[];
    /** Quick filter: matches any cell's text */
    filter?: string;
    /** A stable id per row, so updates keep the scroll and sort */
    rowId: (row: T) => string;
    onrowclick?: (row: T) => void;
  } = $props();

  let el = $state<HTMLDivElement | undefined>();
  let api = $state<GridApi<T> | undefined>();

  $effect(() => {
    const host = el;
    if (!host) return;
    let gone = false;
    let grid: GridApi<T> | undefined;
    void import("ag-grid-community").then(({ createGrid, ModuleRegistry, AllCommunityModule, themeQuartz }) => {
      if (gone) return;
      ModuleRegistry.registerModules([AllCommunityModule]);
      const theme = themeQuartz.withParams({
        browserColorScheme: "dark",
        backgroundColor: "var(--surface-1)",
        foregroundColor: "var(--fg-body)",
        accentColor: "var(--red-hot)",
        borderColor: "var(--border)",
        headerBackgroundColor: "var(--surface-2)",
        headerTextColor: "var(--fg-muted)",
        headerFontSize: 11,
        headerFontWeight: 700,
        oddRowBackgroundColor: "color-mix(in srgb, var(--fg) 3%, var(--surface-1))",
        rowHoverColor: "color-mix(in srgb, var(--fg) 8%, transparent)",
        selectedRowBackgroundColor: "color-mix(in srgb, var(--red) 14%, transparent)",
        fontFamily: "inherit",
        fontSize: 14,
        rowHeight: 38,
        headerHeight: 36,
        spacing: 6,
        wrapperBorder: false,
        wrapperBorderRadius: "var(--r-lg)",
        rowBorder: false,
        columnBorder: false,
      });
      grid = createGrid<T>(host, {
        theme,
        rowData: rows,
        columnDefs: columns,
        defaultColDef: { sortable: true, resizable: true, suppressMovable: true },
        getRowId: (p) => rowId(p.data),
        quickFilterText: filter,
        domLayout: "autoHeight",
        onRowClicked: (e) => e.data && onrowclick?.(e.data),
        suppressCellFocus: true,
      });
      api = grid;
    });
    return () => {
      gone = true;
      grid?.destroy();
      api = undefined;
    };
  });

  // Keep the grid in step with the page: new data, columns, filter
  $effect(() => {
    api?.setGridOption("rowData", rows);
  });
  $effect(() => {
    api?.setGridOption("columnDefs", columns);
  });
  $effect(() => {
    api?.setGridOption("quickFilterText", filter);
  });
</script>

<div class="data-grid" bind:this={el}></div>

<style>
  .data-grid {
    width: 100%;
  }
  .data-grid :global(.ag-header-cell-text) {
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
  }
  .data-grid :global(.ag-row) {
    cursor: pointer;
  }
</style>
