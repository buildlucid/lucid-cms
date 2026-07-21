import type {
	MigrationAssessment,
	MigrationRiskReason,
} from "../../collection/migration/types.js";
import cliLogger from "../logger.js";

/** Formats one structured collection migration reason for CLI output. */
export const describeMigrationRiskReason = (
	reason: MigrationRiskReason,
): string => {
	const target = reason.columnName
		? `${reason.tableName}.${reason.columnName}`
		: reason.indexName
			? `${reason.tableName}.${reason.indexName}`
			: reason.tableName;

	const descriptions: Record<MigrationRiskReason["code"], string> = {
		create_table: `create table ${target}`,
		remove_table: `drop table ${target}`,
		add_nullable_column: `add nullable column ${target}`,
		add_constrained_column: `add required or constrained column ${target}`,
		change_column_default: `change default for ${target}`,
		relax_column_nullability: `make ${target} nullable`,
		tighten_column_nullability: `make ${target} required`,
		modify_column_type: `change the type of ${target}`,
		modify_column_constraint: `change a unique or foreign-key constraint on ${target}`,
		recreate_column: `drop and recreate column ${target}`,
		remove_column: `drop column ${target}`,
		add_index: `add index ${target}`,
		add_unique_index: `add unique index ${target}`,
		remove_index: `remove index ${target}`,
		remove_unique_index: `remove unique index ${target}`,
	};

	return descriptions[reason.code];
};

/** Prints the assessed collection operations grouped by their risk level. */
export const reportMigrationAssessment = (
	assessment: MigrationAssessment,
): void => {
	for (const risk of ["safe", "warning", "destructive"] as const) {
		const reasons = assessment.reasons.filter((reason) => reason.risk === risk);
		if (reasons.length === 0) continue;

		const heading = `${risk[0]?.toUpperCase()}${risk.slice(1)} collection changes:`;
		if (risk === "safe") cliLogger.info(heading);
		else if (risk === "warning") cliLogger.warn(heading);
		else cliLogger.error(heading);

		for (const reason of reasons) {
			cliLogger.log(
				`${reason.collectionKey}: ${describeMigrationRiskReason(reason)}`,
				{ indent: 2, symbol: "child" },
			);
		}
	}
};
