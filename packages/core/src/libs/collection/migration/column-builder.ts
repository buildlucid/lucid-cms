import type {
	AlterTableBuilder,
	AlterTableColumnAlteringBuilder,
	CreateTableBuilder,
} from "kysely";
import type DatabaseAdapter from "../../../libs/db-adapter/adapter-base.js";
import type {
	AddColumnOperation,
	ModifyColumnOperation,
	RemoveColumnOperation,
} from "./types.js";

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
				columnBuilder = db.primaryKeyColumnBuilder(columnBuilder);
			}

			if (operation.column.nullable === false) {
				columnBuilder = columnBuilder.notNull();
			}

			if (operation.column.default !== undefined) {
				const defaultVal = db.formatDefaultValue(
					operation.column.type,
					operation.column.default,
				);
				if (defaultVal !== null) {
					columnBuilder = columnBuilder.defaultTo(defaultVal);
				}
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
 * For simple changes (nullable, default), uses alterColumn.
 * For complex changes (type, unique, foreign key), a drop then add column operation is created
 */
export const modifyColumn = <
	T extends AlterTableColumnAlteringBuilder | AlterTableBuilder,
>(
	query: T,
	operation: ModifyColumnOperation,
	db: DatabaseAdapter,
): T => {
	if (db.supports("alterColumn")) return query;

	let alteredQuery = query;

	//* change nullable if needed
	if (operation.changes.nullable !== undefined) {
		alteredQuery = alteredQuery.alterColumn(operation.column.name, (col) =>
			operation.changes.nullable?.to ? col.dropNotNull() : col.setNotNull(),
		) as T;
	}

	//* change default if needed
	if (operation.changes.default !== undefined) {
		// @ts-expect-error
		alteredQuery = alteredQuery.alterColumn(operation.column.name, (col) => {
			if (
				operation.changes.default?.to === undefined ||
				operation.changes.default?.to === null
			) {
				return col.dropDefault();
			}
			const defaultValue = db.formatDefaultValue(
				operation.column.type,
				operation.changes.default?.to,
			);
			return defaultValue !== null ? col.setDefault(defaultValue) : col;
		}) as T;
	}

	return alteredQuery;
};
