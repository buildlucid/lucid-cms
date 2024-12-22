import type { ServiceResponse } from "../../../types.js";
import type {
	CollectionSchema,
	CollectionSchemaColumn,
} from "../schema/types.js";
import type { MigrationPlan, ColumnOperation } from "./types.js";

const needsModification = (
	newColumn: CollectionSchemaColumn,
	existingColumn: CollectionSchemaColumn,
): boolean => {
	return (
		newColumn.type !== existingColumn.type ||
		newColumn.nullable !== existingColumn.nullable ||
		JSON.stringify(newColumn.default) !==
			JSON.stringify(existingColumn.default) ||
		!areForeignKeysEqual(newColumn.foreignKey, existingColumn.foreignKey) ||
		newColumn.unique !== existingColumn.unique
	);
};

const areForeignKeysEqual = (
	newKey?: CollectionSchemaColumn["foreignKey"],
	existingKey?: CollectionSchemaColumn["foreignKey"],
): boolean => {
	if (!newKey && !existingKey) return true;
	if (!newKey || !existingKey) return false;

	return (
		newKey.table === existingKey.table &&
		newKey.column === existingKey.column &&
		newKey.onDelete === existingKey.onDelete &&
		newKey.onUpdate === existingKey.onUpdate
	);
};

const generateMigrationPlan = (props: {
	schemas: {
		existing: CollectionSchema | null;
		current: CollectionSchema;
	};
	checksums: {
		existing: string | null;
		current: string;
	};
}): Awaited<ServiceResponse<MigrationPlan>> => {
	const plan: MigrationPlan = {
		collectionKey: props.schemas.current.key,
		tables: [],
	};

	if (props.schemas.existing === null) {
		plan.tables = props.schemas.current.tables.map((table) => ({
			type: "create",
			tableName: table.name,
			columnOperations: table.columns.map((column) => ({
				type: "add",
				column,
			})),
		}));
		console.log("Full migration plan for:", props.schemas.current.key);
		return {
			data: plan,
			error: undefined,
		};
	}

	if (props.checksums.existing === props.checksums.current) {
		console.log("No migration required for:", props.schemas.current.key);
		return {
			data: plan,
			error: undefined,
		};
	}

	for (const table of props.schemas.current.tables) {
		const targetTable = props.schemas.existing.tables.find(
			(t) => t.name === table.name,
		);
		if (!targetTable) {
			plan.tables.push({
				type: "create",
				tableName: table.name,
				columnOperations: table.columns.map((column) => ({
					type: "add",
					column,
				})),
			});
			continue;
		}

		const columnOperations: ColumnOperation[] = [];

		for (const column of table.columns) {
			const targetColumn = targetTable.columns.find(
				(c) => c.name === column.name,
			);
			if (!targetColumn) {
				columnOperations.push({
					type: "add",
					column: column,
				});
			} else if (needsModification(column, targetColumn)) {
				columnOperations.push({
					type: "modify",
					column: column,
				});
			}
		}

		for (const column of targetTable.columns) {
			const columnStillExists = table.columns.some(
				(c) => c.name === column.name,
			);
			if (!columnStillExists) {
				columnOperations.push({
					type: "remove",
					column: column,
				});
			}
		}

		if (columnOperations.length) {
			plan.tables.push({
				type: "modify",
				tableName: table.name,
				columnOperations,
			});
		}
	}

	for (const table of props.schemas.existing.tables) {
		const tableStillExists = props.schemas.current.tables.some(
			(t) => t.name === table.name,
		);
		if (!tableStillExists) {
			plan.tables.push({
				type: "remove",
				tableName: table.name,
				columnOperations: [],
			});
		}
	}

	console.log("Partial migration plan for:", props.schemas.current.key);
	return {
		data: plan,
		error: undefined,
	};
};

export default generateMigrationPlan;
