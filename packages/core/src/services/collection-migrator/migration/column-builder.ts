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
} from "kysely";

type QueryBuilder =
	| CreateTableBuilder<string, never>
	| AlterTableColumnAlteringBuilder
	| AlterTableBuilder;

/**
 * Adds a column to a table using the provided query builder
 * @todo Default value needs parsing, if json and using sqlite/libsql it needs stringifying. Move logic to DB Adapter class
 */
export const addColumn = <T extends QueryBuilder>(
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
				columnBuilder = columnBuilder.defaultTo(operation.column.default);
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

export const dropColumn = <T extends QueryBuilder>(
	query: T,
	operation: RemoveColumnOperation,
	db: DatabaseAdapter,
): T => {
	return query as T;
};

export const modifyColumn = <T extends QueryBuilder>(
	query: T,
	operation: ModifyColumnOperation,
	db: DatabaseAdapter,
): T => {
	return query as T;
};
