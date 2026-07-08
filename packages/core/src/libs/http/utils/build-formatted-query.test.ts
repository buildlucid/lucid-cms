import { describe, expect, test } from "vitest";
import z from "zod";
import { queryFormatted } from "../../../schemas/helpers/querystring.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import buildFormattedQuery from "./build-formatted-query.js";

const querySchema = z.object({
	filter: z
		.record(
			z.string(),
			z.union([
				queryFormatted.schema.filters.single,
				queryFormatted.schema.filters.union,
			]),
		)
		.optional(),
	filterOr: queryFormatted.schema.filterOr,
	page: queryFormatted.schema.page,
	perPage: queryFormatted.schema.perPage,
});

const contextWithQuery = (query: Record<string, string>) =>
	({
		req: {
			query: () => query,
		},
	}) as LucidHonoContext;

describe("buildFormattedQuery", () => {
	test("parses grouped OR filters without adding them to top-level filters", async () => {
		const query = await buildFormattedQuery(
			contextWithQuery({
				"filter[title:ilike]": "home",
				"filter[or][1][slug]": "about",
				"filter[or][0][title:ilike]": "landing",
				"filter[or][0][createdBy:in]": "1,2",
			}),
			querySchema,
		);

		expect(query.filter).toEqual({
			title: {
				value: "home",
				operator: "ilike",
			},
		});
		expect(query.filterOr).toEqual([
			[
				{
					key: "title",
					value: "landing",
					operator: "ilike",
				},
				{
					key: "createdBy",
					value: ["1", "2"],
					operator: "in",
				},
			],
			[
				{
					key: "slug",
					value: "about",
					operator: undefined,
				},
			],
		]);
	});

	test("applies nullable field handling inside OR groups", async () => {
		const query = await buildFormattedQuery(
			contextWithQuery({
				"filter[or][0][parentFolderId]": "",
			}),
			querySchema,
			{
				nullableFields: ["parentFolderId"],
			},
		);

		expect(query.filterOr).toEqual([
			[
				{
					key: "parentFolderId",
					value: null,
					operator: undefined,
				},
			],
		]);
	});
});
