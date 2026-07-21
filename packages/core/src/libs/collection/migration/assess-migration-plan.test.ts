import { describe, expect, test } from "vitest";
import assessMigrationPlans from "./assess-migration-plan.js";
import type {
	ColumnOperation,
	IndexOperation,
	MigrationPlan,
	TableMigration,
} from "./types.js";

/** Builds one collection plan around the supplied table migration. */
const planWithTable = (table: TableMigration): MigrationPlan[] => [
	{ collectionKey: "pages", tables: [table] },
];

/** Builds a modification plan for table-driven risk tests. */
const modificationPlan = (props: {
	columns?: ColumnOperation[];
	indexes?: IndexOperation[];
}): MigrationPlan[] =>
	planWithTable({
		type: "modify",
		tableName: "lucid_document__pages__fld",
		priority: 0,
		columnOperations: props.columns ?? [],
		indexOperations: props.indexes ?? [],
	});

describe("assessMigrationPlans", () => {
	test("treats table creation and its initial constraints as safe", () => {
		const assessment = assessMigrationPlans(
			planWithTable({
				type: "create",
				tableName: "lucid_document__pages",
				priority: 0,
				columnOperations: [
					{
						type: "add",
						column: {
							name: "id",
							source: "core",
							type: "integer",
							nullable: false,
							primary: true,
						},
					},
				],
				indexOperations: [],
			}),
		);

		expect(assessment).toMatchObject({
			risk: "safe",
			reasons: [{ code: "create_table", risk: "safe" }],
		});
	});

	test.each([
		{
			label: "a nullable column",
			plans: modificationPlan({
				columns: [
					{
						type: "add",
						column: {
							name: "_summary",
							source: "field",
							type: "text",
							nullable: true,
						},
					},
				],
			}),
			code: "add_nullable_column",
		},
		{
			label: "a default-only change",
			plans: modificationPlan({
				columns: [
					{
						type: "modify",
						column: {
							name: "_status",
							source: "field",
							type: "text",
							default: "draft",
						},
						changes: { default: { from: undefined, to: "draft" } },
					},
				],
			}),
			code: "change_column_default",
		},
		{
			label: "relaxed nullability",
			plans: modificationPlan({
				columns: [
					{
						type: "modify",
						column: {
							name: "_title",
							source: "field",
							type: "text",
							nullable: true,
						},
						changes: { nullable: { from: false, to: true } },
					},
				],
			}),
			code: "relax_column_nullability",
		},
		...(["add", "remove"] as const).map((type) => ({
			label: `${type} a non-unique index`,
			plans: modificationPlan({
				indexes: [
					type === "add"
						? {
								type,
								index: {
									name: "lucid_idx__title",
									columns: ["_title"],
									source: "field" as const,
									unique: false,
								},
							}
						: {
								type,
								index: {
									name: "lucid_idx__title",
									columns: ["_title"],
									unique: false,
								},
							},
				],
			}),
			code: type === "add" ? "add_index" : "remove_index",
		})),
	])("classifies $label as safe", ({ plans, code }) => {
		const assessment = assessMigrationPlans(plans);

		expect(assessment.risk).toBe("safe");
		expect(assessment.reasons[0]?.code).toBe(code);
	});

	test.each([
		{ nullable: false },
		{ primary: true },
		{ unique: true },
		{ foreignKey: { table: "lucid_document__authors", column: "id" } },
	])("treats a constrained added column as warning: %o", (constraint) => {
		const assessment = assessMigrationPlans(
			modificationPlan({
				columns: [
					{
						type: "add",
						column: {
							name: "_author",
							source: "field",
							type: "integer",
							...constraint,
						},
					},
				],
			}),
		);

		expect(assessment).toMatchObject({
			risk: "warning",
			reasons: [{ code: "add_constrained_column" }],
		});
	});

	test.each([
		"add",
		"remove",
	] as const)("treats %s unique index as warning", (type) => {
		const index = {
			name: "lucid_idx__slug",
			columns: ["_slug"],
			unique: true,
		};
		const assessment = assessMigrationPlans(
			modificationPlan({
				indexes: [
					type === "add"
						? { type, index: { ...index, source: "field" } }
						: { type, index },
				],
			}),
		);

		expect(assessment.risk).toBe("warning");
		expect(assessment.reasons[0]?.code).toBe(
			type === "add" ? "add_unique_index" : "remove_unique_index",
		);
	});

	test("treats tightened nullability as warning", () => {
		const assessment = assessMigrationPlans(
			modificationPlan({
				columns: [
					{
						type: "modify",
						column: {
							name: "_title",
							source: "field",
							type: "text",
							nullable: false,
						},
						changes: { nullable: { from: true, to: false } },
					},
				],
			}),
		);

		expect(assessment).toMatchObject({
			risk: "warning",
			reasons: [{ code: "tighten_column_nullability" }],
		});
	});

	test.each([
		{
			label: "table removal",
			plans: planWithTable({
				type: "remove",
				tableName: "lucid_document__pages__old",
				priority: 0,
				columnOperations: [],
				indexOperations: [],
			}),
			code: "remove_table",
		},
		{
			label: "column removal",
			plans: modificationPlan({
				columns: [{ type: "remove", columnName: "legacy" }],
			}),
			code: "remove_column",
		},
		{
			label: "type modification",
			plans: modificationPlan({
				columns: [
					{
						type: "modify",
						column: { name: "value", source: "field", type: "integer" },
						changes: { type: { from: "text", to: "integer" } },
					},
				],
			}),
			code: "modify_column_type",
		},
		{
			label: "unique or foreign-key modification",
			plans: modificationPlan({
				columns: [
					{
						type: "modify",
						column: { name: "value", source: "field", type: "text" },
						changes: { unique: { from: false, to: true } },
					},
				],
			}),
			code: "modify_column_constraint",
		},
		{
			label: "drop-and-add recreation",
			plans: modificationPlan({
				columns: [
					{ type: "remove", columnName: "value" },
					{
						type: "add",
						column: { name: "value", source: "field", type: "text" },
					},
				],
			}),
			code: "recreate_column",
		},
	])("classifies $label as destructive", ({ plans, code }) => {
		const assessment = assessMigrationPlans(plans);

		expect(assessment.risk).toBe("destructive");
		expect(assessment.reasons[0]?.code).toBe(code);
	});

	test("aggregates mixed plans to their highest risk", () => {
		const assessment = assessMigrationPlans([
			...modificationPlan({
				columns: [
					{
						type: "add",
						column: {
							name: "optional",
							source: "field",
							type: "text",
						},
					},
				],
			}),
			...planWithTable({
				type: "remove",
				tableName: "old_table",
				priority: 0,
				columnOperations: [],
				indexOperations: [],
			}),
		]);

		expect(assessment.risk).toBe("destructive");
		expect(assessment.reasons).toHaveLength(2);
	});

	test("returns a safe assessment for a no-op plan", () => {
		expect(
			assessMigrationPlans([{ collectionKey: "pages", tables: [] }]),
		).toEqual({ risk: "safe", reasons: [] });
	});
});
