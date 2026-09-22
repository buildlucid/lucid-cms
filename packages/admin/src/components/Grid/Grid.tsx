import classNames from "classnames";
import { type Component, createMemo, type JSXElement } from "solid-js";

/** Cards across at one width. */
export type GridColumnCount = 1 | 2 | 3 | 4 | 5 | 6;

/** A count per breakpoint, each holding until the next one takes over. */
export interface GridColumnsByBreakpoint {
	base?: GridColumnCount;
	xs?: GridColumnCount;
	sm?: GridColumnCount;
	md?: GridColumnCount;
	lg?: GridColumnCount;
	xl?: GridColumnCount;
}

export type GridColumns = GridColumnCount | GridColumnsByBreakpoint;

//* spelled out so Tailwind sees every class it has to generate
const COLUMN_CLASSES: Record<
	keyof GridColumnsByBreakpoint,
	Record<GridColumnCount, string>
> = {
	base: {
		1: "grid-cols-1",
		2: "grid-cols-2",
		3: "grid-cols-3",
		4: "grid-cols-4",
		5: "grid-cols-5",
		6: "grid-cols-6",
	},
	xs: {
		1: "xs:grid-cols-1",
		2: "xs:grid-cols-2",
		3: "xs:grid-cols-3",
		4: "xs:grid-cols-4",
		5: "xs:grid-cols-5",
		6: "xs:grid-cols-6",
	},
	sm: {
		1: "sm:grid-cols-1",
		2: "sm:grid-cols-2",
		3: "sm:grid-cols-3",
		4: "sm:grid-cols-4",
		5: "sm:grid-cols-5",
		6: "sm:grid-cols-6",
	},
	md: {
		1: "md:grid-cols-1",
		2: "md:grid-cols-2",
		3: "md:grid-cols-3",
		4: "md:grid-cols-4",
		5: "md:grid-cols-5",
		6: "md:grid-cols-6",
	},
	lg: {
		1: "lg:grid-cols-1",
		2: "lg:grid-cols-2",
		3: "lg:grid-cols-3",
		4: "lg:grid-cols-4",
		5: "lg:grid-cols-5",
		6: "lg:grid-cols-6",
	},
	xl: {
		1: "xl:grid-cols-1",
		2: "xl:grid-cols-2",
		3: "xl:grid-cols-3",
		4: "xl:grid-cols-4",
		5: "xl:grid-cols-5",
		6: "xl:grid-cols-6",
	},
};

//* a plain count is the widest layout; narrower screens step down from it
const COLUMN_RAMP: Record<GridColumnCount, GridColumnsByBreakpoint> = {
	1: { base: 1 },
	2: { base: 1, xs: 2 },
	3: { base: 1, xs: 2, lg: 3 },
	4: { base: 1, xs: 2, md: 3, lg: 4 },
	5: { base: 1, xs: 2, md: 3, lg: 4, xl: 5 },
	6: { base: 1, xs: 2, md: 3, lg: 4, xl: 6 },
};

const BREAKPOINTS = ["base", "xs", "sm", "md", "lg", "xl"] as const;

export interface GridProps {
	/**
	 * Cards across at the grid's widest. Narrower screens step down from it.
	 * Pass a count per breakpoint instead to set the steps yourself.
	 * @default 5
	 */
	columns?: GridColumns;
	class?: string;
	/** One list item per card. */
	children: JSXElement;
}

/**
 * A responsive card grid. It lays cards out and nothing else, so wrap it in a
 * QueryBoundary for the loading, error and empty states the way a Table is.
 *
 * @example
 * ```tsx
 * import { Grid, QueryBoundary } from "@lucidcms/admin/components";
 *
 * return (
 * 	<QueryBoundary isLoading={assets.isLoading} isEmpty={assets.data?.data.length === 0}>
 * 		<Grid columns={4}>
 * 			<For each={assets.data?.data}>{(asset) => <AssetCard asset={asset} />}</For>
 * 		</Grid>
 * 	</QueryBoundary>
 * );
 * ```
 *
 * @example
 * ```tsx
 * // one card on a phone, two on a tablet, three from a laptop up
 * <Grid columns={{ base: 1, sm: 2, lg: 3 }}>{cards}</Grid>
 * ```
 */
const Grid: Component<GridProps> = (props) => {
	// ----------------------------------
	// Memos
	const columnClasses = createMemo(() => {
		const columns = props.columns ?? 5;
		const byBreakpoint =
			typeof columns === "number" ? COLUMN_RAMP[columns] : columns;
		return BREAKPOINTS.map((breakpoint) => {
			//* a grid always needs a base, whatever the caller left out
			const count =
				byBreakpoint[breakpoint] ?? (breakpoint === "base" ? 1 : undefined);
			return count ? COLUMN_CLASSES[breakpoint][count] : undefined;
		}).filter(Boolean);
	});

	// ----------------------------------
	// Render
	return (
		<ul
			data-grid
			class={classNames("grid gap-4", columnClasses(), props.class)}
		>
			{props.children}
		</ul>
	);
};

export default Grid;
