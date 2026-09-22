import TableCell from "./parts/TableCell";
import TableDateCell from "./parts/TableDateCell";
import TablePillCell from "./parts/TablePillCell";
import TableRoot from "./parts/TableRoot";
import TableRow from "./parts/TableRow";
import TableTextCell from "./parts/TableTextCell";

export type { TableCellProps } from "./parts/TableCell";
export type { TableDateCellProps } from "./parts/TableDateCell";
export type { TablePillCellProps } from "./parts/TablePillCell";
export type { TableRootProps } from "./parts/TableRoot";
export type { TableRowProps } from "./parts/TableRow";
export type { TableTextCellProps } from "./parts/TableTextCell";
export type {
	TableColumn,
	TablePadding,
	TableRowReorder,
	TableVariant,
} from "./TableContext";

/**
 * A sortable, selectable data table. Cells name the column they belong to, so
 * the table can hide a column, set its padding and remember the viewer's
 * choices without the rows passing anything down.
 *
 * Wrap it in a QueryBoundary to cover the error and empty cases, and pair it
 * with QueryToolbar and Pagination for filtering, sorting and paging.
 *
 * @example
 * ```tsx
 * import { Table } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<Table.Root
 * 		id="reports.list"
 * 		rowCount={reports.data?.data.length ?? 0}
 * 		isLoading={reports.isFetching}
 * 		queryState={queryState}
 * 		head={[
 * 			{ key: "name", label: t("common.name"), sortable: true },
 * 			{ key: "status", label: t("common.status") },
 * 			{ key: "createdAt", label: t("common.created.at"), sortable: true },
 * 		]}
 * 	>
 * 		<Index each={reports.data?.data ?? []}>
 * 			{(report, index) => (
 * 				<Table.Row
 * 					index={index}
 * 					actions={[{ type: "button", label: t("common.edit"), onClick: () => edit(report().id) }]}
 * 				>
 * 					<Table.Text column="name" text={report().name} />
 * 					<Table.Pill column="status" text={report().status} variant="primary-subtle" />
 * 					<Table.Date column="createdAt" date={report().createdAt} />
 * 				</Table.Row>
 * 			)}
 * 		</Index>
 * 	</Table.Root>
 * );
 * ```
 */
const Table = {
	Root: TableRoot,
	Row: TableRow,
	Cell: TableCell,
	Text: TableTextCell,
	Date: TableDateCell,
	Pill: TablePillCell,
};

export default Table;
