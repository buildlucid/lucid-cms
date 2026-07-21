import { getMigrationRiskPriority } from "../../collection/migration/assess-migration-plan.js";
import type {
	MigrationAssessment,
	MigrationRisk,
} from "../../collection/migration/types.js";

/** The next approval action required before migration execution can continue. */
export type MigrationApprovalAction =
	| "proceed"
	| "prompt-warning"
	| "prompt-destructive"
	| "reject-destructive";

/** Inputs used to resolve the non-interactive and interactive migration policy. */
export type MigrationApprovalInput = {
	assessment: MigrationAssessment;
	hasPendingDatabaseMigrations: boolean;
	yes: boolean;
	allowDestructive: boolean;
};

/** Combines collection and arbitrary database migration risk into one level. */
export const getEffectiveMigrationRisk = (
	assessment: MigrationAssessment,
	hasPendingDatabaseMigrations: boolean,
): MigrationRisk => {
	if (assessment.risk === "destructive") return "destructive";
	if (assessment.risk === "warning" || hasPendingDatabaseMigrations) {
		return "warning";
	}
	return "safe";
};

/** Resolves whether migration work can proceed or which approval gate is needed. */
export const resolveMigrationApproval = ({
	assessment,
	hasPendingDatabaseMigrations,
	yes,
	allowDestructive,
}: MigrationApprovalInput): MigrationApprovalAction => {
	if (allowDestructive) return "proceed";

	const risk = getEffectiveMigrationRisk(
		assessment,
		hasPendingDatabaseMigrations,
	);
	if (risk === "destructive") {
		return yes ? "reject-destructive" : "prompt-destructive";
	}
	if (risk === "warning") {
		return yes ? "proceed" : "prompt-warning";
	}
	return "proceed";
};

/** Returns whether a post-database collection plan needs a new approval gate. */
export const requiresPostMigrationApproval = (
	initial: MigrationAssessment,
	updated: MigrationAssessment,
): boolean =>
	getMigrationRiskPriority(updated.risk) >
	getMigrationRiskPriority(initial.risk);
