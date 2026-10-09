<script lang="ts" generics="T">
  // A data grid (AG Grid Community, MIT): sortable, resizable columns, a quick filter, row clicks. Loaded only
  // when one is shown, so pages without a grid don't download it, and only the modules it uses (sorting, resizing
  // and pinning are in the core). It fills its container and scrolls inside it, header row in view: the container
  // sets the height. Themed from the app's tokens, dark only.
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
    void import("ag-grid-community").then((ag) => {
      if (gone) return;
      const { createGrid, ModuleRegistry, themeQuartz } = ag;
      ModuleRegistry.registerModules([
        ag.ClientSideRowModelModule,
        ag.QuickFilterModule,
        // Columns as wide as what's in them
        ag.ColumnAutoSizeModule,
        // cellClass as a function (what's owed, in red)
        ag.CellStyleModule,
        // In dev, AG Grid names any feature a column asks for that isn't registered
        ...(import.meta.env.DEV ? [ag.ValidationModule] : []),
      ]);
      const theme = themeQuartz.withParams({
        browserColorScheme: "dark",
        backgroundColor: "var(--surface-1)",
        foregroundColor: "var(--fg-body)",
        accentColor: "var(--red-hot)",
        borderColor: "var(--border)",
        headerBackgroundColor: "var(--surface-2)",
        headerTextColor: "var(--fg-muted)",
        headerFontSize: 11,
        headerFontWeight: 600,
        oddRowBackgroundColor: "color-mix(in srgb, var(--fg) 3%, var(--surface-1))",
        rowHoverColor: "color-mix(in srgb, var(--fg) 8%, transparent)",
        selectedRowBackgroundColor: "color-mix(in srgb, var(--red) 14%, transparent)",
        fontFamily: "inherit",
        fontSize: 14,
        rowHeight: 38,
        headerHeight: 36,
        spacing: 6,
        // Tight cells, so a table of a dozen columns fits beside the settings list
        cellHorizontalPadding: 8,
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
        // Each column as wide as its widest cell or its header, any room left shared out; again when the rows change
        autoSizeStrategy: { type: "fitCellContents", scaleUpToFitGridWidth: true, continuous: true },
        getRowId: (p) => rowId(p.data),
        quickFilterText: filter,
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
    height: 100%;
  }
  /* AG Grid turns its cells to subpixel smoothing, which draws light-on-dark text heavier than the rest of the app */
  .data-grid :global(.ag-root-wrapper),
  .data-grid :global(.ag-root-wrapper *) {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .data-grid :global(.ag-header-cell-text) {
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
  }
  .data-grid :global(.ag-row) {
    cursor: pointer;
  }
</style>
