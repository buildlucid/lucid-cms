import type {
	AddColumnOperation,
	MigrationAssessment,
	MigrationPlan,
	MigrationRisk,
	MigrationRiskReason,
	ModifyColumnOperation,
	TableMigration,
} from "./types.js";

const riskPriority: Record<MigrationRisk, number> = {
	safe: 0,
	warning: 1,
	destructive: 2,
};

/** Returns the highest risk represented by a list of assessment reasons. */
const getHighestRisk = (reasons: MigrationRiskReason[]): MigrationRisk => {
	return reasons.reduce<MigrationRisk>((highest, reason) => {
		return riskPriority[reason.risk] > riskPriority[highest]
			? reason.risk
			: highest;
	}, "safe");
};

/** Assesses the constraints applied by a column added to an existing table. */
const assessAddedColumn = (
	plan: MigrationPlan,
	table: TableMigration,
	operation: AddColumnOperation,
): MigrationRiskReason => {
	const constrained =
		operation.column.nullable === false ||
		operation.column.primary === true ||
		operation.column.unique === true ||
		operation.column.foreignKey !== undefined;

	return {
		risk: constrained ? "warning" : "safe",
		code: constrained ? "add_constrained_column" : "add_nullable_column",
		collectionKey: plan.collectionKey,
		tableName: table.tableName,
		columnName: operation.column.name,
	};
};

/** Assesses in-place changes to one existing column. */
const assessModifiedColumn = (
	plan: MigrationPlan,
	table: TableMigration,
	operation: ModifyColumnOperation,
): MigrationRiskReason[] => {
	const reasons: MigrationRiskReason[] = [];
	const baseReason = {
		collectionKey: plan.collectionKey,
		tableName: table.tableName,
		columnName: operation.column.name,
	};

	if (operation.changes.type) {
		reasons.push({
			...baseReason,
			risk: "destructive",
			code: "modify_column_type",
		});
	}
	if (operation.changes.unique || operation.changes.foreignKey) {
		reasons.push({
			...baseReason,
			risk: "destructive",
			code: "modify_column_constraint",
		});
	}
	if (operation.changes.nullable) {
		reasons.push({
			...baseReason,
			risk: operation.changes.nullable.to ? "safe" : "warning",
			code: operation.changes.nullable.to
				? "relax_column_nullability"
				: "tighten_column_nullability",
		});
	}
	if (
		operation.changes.default &&
		!operation.changes.type &&
		!operation.changes.unique &&
		!operation.changes.foreignKey
	) {
		reasons.push({
			...baseReason,
			risk: "safe",
			code: "change_column_default",
		});
	}

	return reasons;
};

/** Assesses all column operations while collapsing drop-and-add recreations. */
const assessColumnOperations = (
	plan: MigrationPlan,
	table: TableMigration,
): MigrationRiskReason[] => {
	const reasons: MigrationRiskReason[] = [];
	const addedColumnNames = new Set(
		table.columnOperations
			.filter((operation) => operation.type === "add")
			.map((operation) => operation.column.name),
	);
	const recreatedColumnNames = new Set(
		table.columnOperations
			.filter((operation) => operation.type === "remove")
			.map((operation) => operation.columnName)
			.filter((columnName) => addedColumnNames.has(columnName)),
	);

	for (const operation of table.columnOperations) {
		const columnName =
			operation.type === "remove"
				? operation.columnName
				: operation.column.name;

		if (recreatedColumnNames.has(columnName)) {
			if (operation.type === "remove") {
				reasons.push({
					risk: "destructive",
					code: "recreate_column",
					collectionKey: plan.collectionKey,
					tableName: table.tableName,
					columnName,
				});
			}
			continue;
		}

		switch (operation.type) {
			case "add":
				reasons.push(assessAddedColumn(plan, table, operation));
				break;
			case "modify":
				reasons.push(...assessModifiedColumn(plan, table, operation));
				break;
			case "remove":
				reasons.push({
					risk: "destructive",
					code: "remove_column",
					collectionKey: plan.collectionKey,
					tableName: table.tableName,
					columnName: operation.columnName,
				});
				break;
		}
	}

	return reasons;
};

/** Assesses generated index additions and removals, including uniqueness. */
const assessIndexOperations = (
	plan: MigrationPlan,
	table: TableMigration,
): MigrationRiskReason[] => {
	return table.indexOperations.map((operation) => {
		const unique = operation.index.unique === true;
		return {
			risk: unique ? "warning" : "safe",
			code:
				operation.type === "add"
					? unique
						? "add_unique_index"
						: "add_index"
					: unique
						? "remove_unique_index"
						: "remove_index",
			collectionKey: plan.collectionKey,
			tableName: table.tableName,
			indexName: operation.index.name,
		} satisfies MigrationRiskReason;
	});
};

/** Assesses a table operation and its nested column and index operations. */
const assessTable = (
	plan: MigrationPlan,
	table: TableMigration,
): MigrationRiskReason[] => {
	if (table.type === "create") {
		return [
			{
				risk: "safe",
				code: "create_table",
				collectionKey: plan.collectionKey,
				tableName: table.tableName,
			},
		];
	}
	if (table.type === "remove") {
		return [
			{
				risk: "destructive",
				code: "remove_table",
				collectionKey: plan.collectionKey,
				tableName: table.tableName,
			},
		];
	}

	return [
		...assessColumnOperations(plan, table),
		...assessIndexOperations(plan, table),
	];
};

/**
 * Classifies collection migration operations by their highest potential impact.
 * Safe plans can run automatically, warnings require approval, and destructive
 * plans require explicit acknowledgement that stored data may be lost.
 */
const assessMigrationPlans = (plans: MigrationPlan[]): MigrationAssessment => {
	const reasons = plans.flatMap((plan) =>
		plan.tables.flatMap((table) => assessTable(plan, table)),
	);

	return {
		risk: getHighestRisk(reasons),
		reasons,
	};
};

/** Returns the numeric ordering used when comparing migration risk levels. */
export const getMigrationRiskPriority = (risk: MigrationRisk): number =>
	riskPriority[risk];

export default assessMigrationPlans;
