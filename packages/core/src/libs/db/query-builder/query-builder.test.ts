import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, describe, expect, test } from "vitest";
import queryBuilder from "./query-builder.js";

describe("queryBuilder semantic filters", () => {
	const db = new SQLiteAdapter({ database: ":memory:" });

	afterAll(() => db.client.destroy());

	const compile = (
		filter: {
			value: string | string[] | null;
			operator: "contains" | "not-ends-with" | "not-in" | "is-not";
		},
		caseInsensitiveLikeOperator: "like" | "ilike" = "like",
	) => {
		const { main } = queryBuilder(
			{
				main: db.client.selectFrom("lucid_media_folders").select("title"),
			},
			{
				queryParams: {
					filter: { title: filter },
				},
				database: { caseInsensitiveLikeOperator },
				meta: {
					tableKeys: {
						filters: { title: "lucid_media_folders.title" },
					},
				},
			},
		);

		return main.compile();
	};

	test("escapes literal wildcard characters and uses the adapter operator", () => {
		const query = compile({ value: "50%_off!", operator: "contains" }, "ilike");

		expect(query.sql).toContain(
			'"lucid_media_folders"."title" ilike ? escape \'!\'',
		);
		expect(query.parameters).toEqual(["%50!%!_off!!%"]);
	});

	test("compiles negative semantic and hyphenated comparison operators", () => {
		const negativeText = compile({
			value: "draft",
			operator: "not-ends-with",
		});
		expect(negativeText.sql).toContain("not like ? escape '!'");
		expect(negativeText.parameters).toEqual(["%draft"]);

		const notIn = compile({ value: ["one", "two"], operator: "not-in" });
		expect(notIn.sql).toContain("not in (?, ?)");
		expect(notIn.parameters).toEqual(["one", "two"]);

		const isNot = compile({ value: null, operator: "is-not" });
		expect(isNot.sql).toContain("is not null");
	});
});
