import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { sql } from "kysely";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import createLucidDatabase from "../../../create-lucid-database.js";
import type { DatabaseConnection } from "../../../types.js";
import { codecs } from "../../codecs/index.js";
import type LucidDatabase from "../../lucid-database.js";
import { queryNodeTableName } from "../metadata.js";
import { createResultPlan, decodeResultRow } from "./plan.js";

describe("result plans", () => {
	let adapter: SQLiteAdapter;
	let connection: DatabaseConnection;
	let database: LucidDatabase;

	beforeAll(async () => {
		adapter = new SQLiteAdapter({ database: ":memory:" });
		connection = await adapter.connect();
		database = createLucidDatabase({ client: connection.client, adapter });
	});

	afterAll(async () => {
		await connection.destroy();
	});

	test("preserves nested aggregate metadata through Kysely plugins", () => {
		const query = database.kysely
			.selectFrom("lucid_oauth_clients")
			.select(() => [
				database.fn
					.jsonArrayFrom(
						database.kysely
							.selectFrom("lucid_media as related_media_image")
							.select((eb) => [
								"related_media_image.id",
								database.fn
									.jsonArrayFrom(
										eb
											.selectFrom("lucid_media_translations")
											.select("lucid_media_translations.title"),
									)
									.as("translations"),
							]),
					)
					.as("logo"),
			]);

		const plan = createResultPlan(query.toOperationNode(), database.tables);
		expect(plan.logo?.nested?.translations).toBeDefined();
	});

	test("resolves codecs selected through a CTE", () => {
		const query = database.kysely
			.with("notification_rows", (db) =>
				db.selectFrom("lucid_notifications").select(["id", "data"]),
			)
			.selectFrom("notification_rows")
			.select("data");

		const plan = createResultPlan(query.toOperationNode(), database.tables);
		expect(plan.data?.codec).toBe(codecs.json);
		expect(plan.data?.columnType).toBe("json");
		expect(queryNodeTableName(query.toOperationNode())).toBe(
			"lucid_notifications",
		);
	});

	test("resolves explicitly tagged computed-result codecs", () => {
		const query = database.kysely
			.selectFrom("lucid_requests")
			.select(
				database.fn.withCodec(sql<unknown>`'{}'`, codecs.json).as("data"),
			);

		const plan = createResultPlan(query.toOperationNode(), database.tables);
		expect(plan.data?.codec).toBe(codecs.json);
	});

	test("plans select-all and aliased columns without touching plain values", () => {
		const selectAll = database.kysely
			.selectFrom("lucid_notifications")
			.selectAll();
		const selectAllPlan = createResultPlan(
			selectAll.toOperationNode(),
			database.tables,
		);

		expect(selectAllPlan.data?.codec).toBe(codecs.json);
		expect(selectAllPlan.message).toBeUndefined();

		const aliased = database.kysely
			.selectFrom("lucid_notifications as notification")
			.select("notification.data as details");
		const aliasedPlan = createResultPlan(
			aliased.toOperationNode(),
			database.tables,
		);

		expect(aliasedPlan.details?.codec).toBe(codecs.json);
		expect(aliasedPlan.data).toBeUndefined();
	});

	test("propagates codecs through derived tables", () => {
		const query = database.kysely
			.selectFrom(
				database.kysely
					.selectFrom("lucid_notifications")
					.select("data")
					.as("notification_rows"),
			)
			.select("notification_rows.data");

		const plan = createResultPlan(query.toOperationNode(), database.tables);
		expect(plan.data?.codec).toBe(codecs.json);
	});

	test("does not guess the source of an ambiguous unqualified column", () => {
		const query = database.kysely
			.selectFrom("lucid_notifications")
			.innerJoin("lucid_emails", "lucid_emails.id", "lucid_notifications.id")
			.select("data");

		const plan = createResultPlan(query.toOperationNode(), database.tables);
		expect(plan.data).toBeUndefined();
	});

	test("plans codecs for mutation returning clauses", () => {
		const query = database.kysely
			.updateTable("lucid_notifications")
			.set({ data: { source: "test" } })
			.returning("data");

		const plan = createResultPlan(query.toOperationNode(), database.tables);
		expect(plan.data?.codec).toBe(codecs.json);
	});

	test("does not apply a branch-specific codec to UNION rows", () => {
		const jsonBranch = database.kysely
			.selectFrom("lucid_notifications")
			.select("data as value")
			.$castTo<{ value: unknown }>();
		const textBranch = database.kysely
			.selectFrom("lucid_users")
			.select("email as value")
			.$castTo<{ value: unknown }>();
		const union = jsonBranch.unionAll(textBranch);
		const query = database.kysely.selectNoFrom(() => [
			database.fn.jsonArrayFrom(union).as("rows"),
		]);

		const plan = createResultPlan(query.toOperationNode(), database.tables);
		expect(plan.rows?.codec).toBe(codecs.json);
		expect(plan.rows?.nested?.value).toBeUndefined();
	});

	test("keeps JSON-looking text untouched inside driver-native arrays", () => {
		const driverValue = [
			{
				metadata: { enabled: true },
				label: '["this is text"]',
			},
		];
		const decoded = decodeResultRow(
			{ rows: driverValue },
			{
				rows: {
					codec: codecs.json,
					container: "array",
					nested: { metadata: { codec: codecs.json } },
				},
			},
			adapter,
		);

		expect(decoded).toEqual({ rows: driverValue });
	});
});
