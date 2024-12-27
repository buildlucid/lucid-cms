import type DatabaseAdapter from "../../../libs/db/adapter.js";
import type {
	AddColumnOperation,
	ModifyColumnOperation,
	RemoveColumnOperation,
} from "./types.js";
import type {
	CreateTableBuilder,
	AlterTableColumnAlteringBuilder,
	AlterTableBuilder,
	AlteredColumnBuilder,
} from "kysely";

/**
 * Adds a column to a table using the provided query builder
 */
export const addColumn = <
	T extends
		| CreateTableBuilder<string, never>
		| AlterTableColumnAlteringBuilder
		| AlterTableBuilder,
>(
	query: T,
	operation: AddColumnOperation,
	db: DatabaseAdapter,
): T => {
	return query.addColumn(
		operation.column.name,
		operation.column.type,
		(column) => {
			let columnBuilder = column;

			if (operation.column.primary) {
				columnBuilder = db.createPrimaryKeyColumn(columnBuilder);
			}

			if (operation.column.nullable === false) {
				columnBuilder = columnBuilder.notNull();
			}

			if (operation.column.default !== undefined) {
				columnBuilder = columnBuilder.defaultTo(
					db.formatInsertValue(operation.column.type, operation.column.default),
				);
			}

			if (operation.column.foreignKey) {
				columnBuilder = columnBuilder.references(
					`${operation.column.foreignKey.table}.${operation.column.foreignKey.column}`,
				);

				if (operation.column.foreignKey.onDelete) {
					columnBuilder = columnBuilder.onDelete(
						operation.column.foreignKey.onDelete,
					);
				}

				if (operation.column.foreignKey.onUpdate) {
					columnBuilder = columnBuilder.onUpdate(
						operation.column.foreignKey.onUpdate,
					);
				}
			}

			return columnBuilder;
		},
	) as T;
};

/**
 * Drops a column from a table using the provided query builder
 */
export const dropColumn = <
	T extends AlterTableColumnAlteringBuilder | AlterTableBuilder,
>(
	query: T,
	operation: RemoveColumnOperation,
	db: DatabaseAdapter,
): T => {
	return query.dropColumn(operation.columnName) as T;
};

/**
 * Modifies an existing column in a table using the provided query builder.
 * For simple changes (type, nullable, default), uses alterColumn.
 * For complex changes (unique, foreign key), drops and recreates the column. Data will be lost in these situations.
 */
export const modifyColumn = <
	T extends AlterTableColumnAlteringBuilder | AlterTableBuilder,
>(
	query: T,
	operation: ModifyColumnOperation,
	db: DatabaseAdapter,
): T => {
	const hasComplexChanges =
		operation.changes.unique !== undefined ||
		operation.changes.foreignKey !== undefined;

	if (!hasComplexChanges) {
		return query.alterColumn(operation.column.name, (col) => {
			if (operation.changes.type) {
				col.setDataType(operation.changes.type.to);
			}
			if (operation.changes.nullable !== undefined) {
				if (operation.changes.nullable.to) col.dropNotNull();
				else col.setNotNull();
			}
			if (operation.changes.default !== undefined) {
				if (operation.changes.default.to === undefined) col.dropDefault();
				else
					col.setDefault(
						db.formatInsertValue(
							operation.column.type,
							operation.changes.default.to,
						),
					);
			}
			return col as unknown as AlteredColumnBuilder;
		}) as T;
	}

	return addColumn(
		dropColumn(
			query,
			{ type: "remove", columnName: operation.column.name },
			db,
		),
		{
			type: "add",
			column: operation.column,
		},
		db,
	);
};
