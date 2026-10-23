import { describe, expect, test } from "vitest";
import type { MigrationAssessment } from "../../collection/migration/types.js";
import {
	requiresPostMigrationApproval,
	resolveMigrationApproval,
} from "./migration-approval.js";

/** Builds the minimum assessment required to exercise approval policy. */
const assessment = (
	risk: MigrationAssessment["risk"],
): MigrationAssessment => ({
	risk,
	reasons:
		risk === "safe"
			? []
			: [
					{
						risk,
						code:
							risk === "warning"
								? "tighten_column_nullability"
								: "remove_column",
						collectionKey: "pages",
						tableName: "lucid_document__pages__fld",
						columnName: "_title",
					},
				],
});

describe("resolveMigrationApproval", () => {
	test("safe collection-only plans proceed without prompting", () => {
		expect(
			resolveMigrationApproval({
				assessment: assessment("safe"),
				hasPendingDatabaseMigrations: false,
				yes: false,
				allowDestructive: false,
			}),
		).toBe("proceed");
	});

	test("arbitrary database migrations and collection warnings prompt", () => {
		for (const input of [
			{
				assessment: assessment("safe"),
				hasPendingDatabaseMigrations: true,
			},
			{
				assessment: assessment("warning"),
				hasPendingDatabaseMigrations: false,
			},
		]) {
			expect(
				resolveMigrationApproval({
					...input,
					yes: false,
					allowDestructive: false,
				}),
			).toBe("prompt-warning");
		}
	});

	test("--yes accepts warnings", () => {
		expect(
			resolveMigrationApproval({
				assessment: assessment("warning"),
				hasPendingDatabaseMigrations: false,
				yes: true,
				allowDestructive: false,
			}),
		).toBe("proceed");
	});

	test("destructive plans reject --yes and otherwise prompt", () => {
		expect(
			resolveMigrationApproval({
				assessment: assessment("destructive"),
				hasPendingDatabaseMigrations: false,
				yes: true,
				allowDestructive: false,
			}),
		).toBe("reject-destructive");
		expect(
			resolveMigrationApproval({
				assessment: assessment("destructive"),
				hasPendingDatabaseMigrations: false,
				yes: false,
				allowDestructive: false,
			}),
		).toBe("prompt-destructive");
	});

	test("--allow-destructive accepts destructive work and implies --yes", () => {
		expect(
			resolveMigrationApproval({
				assessment: assessment("destructive"),
				hasPendingDatabaseMigrations: true,
				yes: false,
				allowDestructive: true,
			}),
		).toBe("proceed");
	});

	test("post-database re-planning requires approval when risk increases", () => {
		expect(
			requiresPostMigrationApproval(
				assessment("safe"),
				assessment("destructive"),
			),
		).toBe(true);
		expect(
			requiresPostMigrationApproval(
				assessment("warning"),
				assessment("warning"),
			),
		).toBe(false);
	});
});
