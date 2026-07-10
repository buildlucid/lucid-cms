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
				"filter[title:contains]": "home",
				"filter[or][1][slug]": "about",
				"filter[or][0][title:starts-with]": "landing",
				"filter[or][0][createdBy:not-in]": "1,2",
			}),
			querySchema,
		);

		expect(query.filter).toEqual({
			title: {
				value: "home",
				operator: "contains",
			},
		});
		expect(query.filterOr).toEqual([
			[
				{
					key: "title",
					value: "landing",
					operator: "starts-with",
				},
				{
					key: "createdBy",
					value: ["1", "2"],
					operator: "not-in",
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

	test("accepts comparison and semantic text operators", async () => {
		const query = await buildFormattedQuery(
			contextWithQuery({
				"filter[_title:contains]": "home, 50%_page\\",
				"filter[_summary:not-ends-with]": "draft",
				"filter[_amount:>=]": "10",
				"filter[_amount:<]": "100",
				"filter[or][0][_publishedAt:>]": "2026-01-01",
				"filter[or][0][_publishedAt:<=]": "2026-12-31",
			}),
			querySchema,
		);

		expect(query.filter).toEqual({
			_title: {
				value: "home, 50%_page\\",
				operator: "contains",
			},
			_summary: {
				value: "draft",
				operator: "not-ends-with",
			},
			_amount: {
				value: "100",
				operator: "<",
			},
		});
		expect(query.filterOr).toEqual([
			[
				{
					key: "_publishedAt",
					value: "2026-01-01",
					operator: ">",
				},
				{
					key: "_publishedAt",
					value: "2026-12-31",
					operator: "<=",
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
