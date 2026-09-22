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
export type { TableColumn, TablePadding, TableVariant } from "./TableContext";

/**
 * A data table with sorting, row actions, row selection and column visibility.
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
 * 		id="redirects"
 * 		rowCount={redirects.data?.data.length ?? 0}
 * 		loading={redirects.isFetching}
 * 		queryState={queryState}
 * 		columns={[
 * 			{ key: "from", label: t("redirects.from"), sortable: true },
 * 			{ key: "status", label: t("common.status") },
 * 			{ key: "createdAt", label: t("common.created.at"), sortable: true },
 * 		]}
 * 	>
 * 		<Index each={redirects.data?.data}>
 * 			{(redirect, index) => (
 * 				<Table.Row
 * 					index={index}
 * 					actions={[
 * 						{ type: "button", label: t("common.edit"), icon: "pen", onClick: () => edit(redirect().id) },
 * 					]}
 * 				>
 * 					<Table.Text column="from" text={redirect().from} />
 * 					<Table.Pill column="status" text={redirect().status} />
 * 					<Table.Date column="createdAt" date={redirect().createdAt} />
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
