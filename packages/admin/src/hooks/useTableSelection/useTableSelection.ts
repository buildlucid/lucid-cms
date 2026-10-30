import { type Accessor, createMemo, createSignal } from "solid-js";

export type TableRowId = string | number;

export interface TableSelection<TRow extends { id: TableRowId }> {
	/** Selected rows in the order they were picked, including rows from other pages. */
	rows: Accessor<TRow[]>;
	count: Accessor<number>;
	isSelected: (_row: TRow) => boolean;
	toggle: (_row: TRow) => void;
	/** Selects or deselects every given row, eg. the current page. */
	set: (_rows: readonly TRow[], _selected: boolean) => void;
	clear: () => void;
}

/**
 * Holds a table's selected rows by ID, so the selection survives paging, filtering and sorting.
 * Create it in the component that owns the query, and pass it to `Table.Root` with the same rows as `data`.
 *
 * @example
 * ```tsx
 * import { Table } from "@lucidcms/admin/components";
 * import { useTableSelection } from "@lucidcms/admin/hooks";
 *
 * const selection = useTableSelection<Redirect>();
 *
 * return (
 * 	<Table.Root
 * 		id="redirects"
 * 		rowCount={redirects.data?.data.length ?? 0}
 * 		data={redirects.data?.data}
 * 		selection={selection}
 * 		allowDelete={true}
 * 		onDeleteRows={(rows) => deleteRedirects(rows.map((row) => row.id))}
 * 		columns={columns}
 * 	>
 * 		...
 * 	</Table.Root>
 * );
 * ```
 */
export const useTableSelection = <
	TRow extends { id: TableRowId },
>(): TableSelection<TRow> => {
	const [selected, setSelected] = createSignal<ReadonlyMap<TableRowId, TRow>>(
		new Map(),
	);
	const rows = createMemo(() => Array.from(selected().values()));

	return {
		rows,
		count: () => selected().size,
		isSelected: (row) => selected().has(row.id),
		toggle: (row) => {
			setSelected((prev) => {
				const next = new Map(prev);
				if (next.has(row.id)) next.delete(row.id);
				else next.set(row.id, row);
				return next;
			});
		},
		set: (rows, value) => {
			setSelected((prev) => {
				const next = new Map(prev);
				for (const row of rows) {
					if (value) next.set(row.id, row);
					else next.delete(row.id);
				}
				return next;
			});
		},
		clear: () => {
			setSelected((prev) => (prev.size === 0 ? prev : new Map()));
		},
	};
};
