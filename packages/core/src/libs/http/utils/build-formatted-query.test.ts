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

/** Fakes Hono's query readers: `query` gives each parameter's first value and `queries` gives them all. */
const contextWithQuery = (query: Record<string, string | string[]>) =>
	({
		req: {
			query: () =>
				Object.fromEntries(
					Object.entries(query).map(([key, value]) => [
						key,
						Array.isArray(value) ? (value[0] ?? "") : value,
					]),
				),
			queries: () =>
				Object.fromEntries(
					Object.entries(query).map(([key, value]) => [
						key,
						Array.isArray(value) ? value : [value],
					]),
				),
		},
	}) as LucidHonoContext;

describe("buildFormattedQuery", () => {
	test("parses dotted environment status filter keys", async () => {
		const query = await buildFormattedQuery(
			contextWithQuery({
				"filter[envStatus.production:=]": "out-of-sync",
			}),
			querySchema,
		);

		expect(query.filter).toEqual({
			"envStatus.production": {
				value: "out-of-sync",
				operator: "=",
			},
		});
	});

	test("parses grouped OR filters without adding them to top-level filters", async () => {
		const query = await buildFormattedQuery(
			contextWithQuery({
				"filter[title:contains]": "home",
				"filter[or][1][slug]": "about",
				"filter[or][0][title:starts-with]": "landing",
				"filter[or][0][createdBy:not-in]": ["1", "2"],
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
				"filter[fields.title:contains]": "home, 50%_page\\",
				"filter[fields.summary:not-ends-with]": "draft",
				"filter[fields.amount:>=]": "10",
				"filter[fields.amount:<]": "100",
				"filter[or][0][fields.publishedAt:>]": "2026-01-01",
				"filter[or][0][fields.publishedAt:<=]": "2026-12-31",
			}),
			querySchema,
		);

		expect(query.filter).toEqual({
			"fields.title": {
				value: "home, 50%_page\\",
				operator: "contains",
			},
			"fields.summary": {
				value: "draft",
				operator: "not-ends-with",
			},
			"fields.amount": {
				value: "100",
				operator: "<",
			},
		});
		expect(query.filterOr).toEqual([
			[
				{
					key: "fields.publishedAt",
					value: "2026-01-01",
					operator: ">",
				},
				{
					key: "fields.publishedAt",
					value: "2026-12-31",
					operator: "<=",
				},
			],
		]);
	});

	test("keeps commas inside an equality value", async () => {
		const query = await buildFormattedQuery(
			contextWithQuery({
				"filter[fields.title]": "Hello, world",
				"filter[or][0][fields.title]": "Goodbye, world",
			}),
			querySchema,
		);

		expect(query.filter).toEqual({
			"fields.title": {
				value: "Hello, world",
				operator: undefined,
			},
		});
		expect(query.filterOr).toEqual([
			[
				{
					key: "fields.title",
					value: "Goodbye, world",
					operator: undefined,
				},
			],
		]);
	});

	test("reads repeated in parameters as a list", async () => {
		const query = await buildFormattedQuery(
			contextWithQuery({
				"filter[id:in]": ["1", "2"],
				"filter[fields.title:not-in]": "Hello, world",
			}),
			querySchema,
		);

		expect(query.filter).toEqual({
			id: {
				value: ["1", "2"],
				operator: "in",
			},
			"fields.title": {
				value: ["Hello, world"],
				operator: "not-in",
			},
		});
	});

	test("reads an empty value as null for the is and is-not operators", async () => {
		const query = await buildFormattedQuery(
			contextWithQuery({
				"filter[deletedBy:is]": "",
				"filter[fields.title:is-not]": "",
				"filter[fields.summary]": "",
			}),
			querySchema,
		);

		expect(query.filter).toEqual({
			deletedBy: {
				value: null,
				operator: "is",
			},
			"fields.title": {
				value: null,
				operator: "is-not",
			},
			"fields.summary": {
				value: "",
				operator: undefined,
			},
		});
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
