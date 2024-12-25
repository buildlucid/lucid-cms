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
	AlterColumnBuilder,
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
					db.formatDefaultValue(operation.column.default),
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
 * Modifies an existing column in a table using the provided query builder
 * @todo need to pass down column type as we likely need to use the modifyColumn method which requires it for its second arg
 */
export const modifyColumn = <
	T extends AlterTableColumnAlteringBuilder | AlterTableBuilder,
>(
	query: T,
	operation: ModifyColumnOperation,
	db: DatabaseAdapter,
): T => {
	const { columnName, changes } = operation;
	let modifiedQuery = query;

	//* handles type, nullable and default changes
	if (
		changes.type ||
		changes.nullable !== undefined ||
		changes.default !== undefined
	) {
		modifiedQuery = modifiedQuery.alterColumn(columnName, (col) => {
			if (changes.type) {
				col.setDataType(changes.type.to);
			}

			if (changes.nullable !== undefined) {
				if (changes.nullable.to) col.dropNotNull();
				else col.setNotNull();
			}

			if (changes.default !== undefined) {
				if (changes.default.to === undefined) col.dropDefault();
				else col.setDefault(db.formatDefaultValue(changes.default.to));
			}

			return col as unknown as AlteredColumnBuilder;
		}) as T;
	}

	//* handle unique
	if (changes.unique) {
	}

	//*andle foreign key changes
	if (changes.foreignKey) {
	}

	return modifiedQuery;
};
