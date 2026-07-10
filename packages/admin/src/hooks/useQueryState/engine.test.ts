import { describe, expect, it } from "vitest";
import {
	arrayFilter,
	booleanFilter,
	pagination,
	sort,
	textFilter,
} from "./codecs";
import {
	applyParams,
	buildQueryString,
	defaultQueryState,
	hasDefaultFiltersApplied,
	hasFiltersApplied,
	parseSearchIntoState,
	resetFiltersState,
	statesEqual,
	stateToStorageSearch,
} from "./engine";
import type { QueryStateSchema } from "./types";

const schema: QueryStateSchema = {
	filters: {
		title: textFilter(),
		isDeleted: booleanFilter(),
		author: arrayFilter({ defaultOperator: "in" }),
	},
	sorts: {
		updatedAt: sort({ defaultValue: "desc" }),
		createdAt: sort(),
	},
	pagination: pagination({ defaultPage: 1, defaultPerPage: 10 }),
};

describe("defaultQueryState", () => {
	it("builds canonical state from schema defaults", () => {
		const state = defaultQueryState(schema);
		expect(state.filters.title).toEqual({ value: "", operator: undefined });
		expect(state.filters.isDeleted).toEqual({
			value: undefined,
			operator: undefined,
		});
		expect(state.filters.author).toEqual({ value: [], operator: "in" });
		expect(state.orFilterGroups).toEqual([]);
		expect(state.sorts).toEqual({ updatedAt: "desc", createdAt: undefined });
		expect(state.pagination).toEqual({ page: 1, perPage: 10 });
	});
});

describe("parseSearchIntoState", () => {
	it("parses filters, sorts and pagination", () => {
		const state = parseSearchIntoState(
			"filter[title]=hello&filter[isDeleted]=1&sort=createdAt&page=3&perPage=20",
			schema,
		);
		expect(state.filters.title?.value).toBe("hello");
		expect(state.filters.isDeleted?.value).toBe(true);
		expect(state.sorts).toEqual({ updatedAt: undefined, createdAt: "asc" });
		expect(state.pagination).toEqual({ page: 3, perPage: 20 });
	});

	it("parses operators from filter params and coerces array values", () => {
		const state = parseSearchIntoState("filter[author:in]=1,2", schema);
		expect(state.filters.author).toEqual({
			value: [1, 2],
			operator: "in",
			operatorExplicit: true,
		});
	});

	it("falls back to the codec default operator when the URL has none", () => {
		const state = parseSearchIntoState("filter[author]=1,2", schema);
		expect(state.filters.author?.operator).toBe("in");
	});

	it("applies schema defaults when params are absent", () => {
		const state = parseSearchIntoState("", schema);
		expect(state.sorts.updatedAt).toBe("desc");
		expect(state.pagination).toEqual({ page: 1, perPage: 10 });
	});

	it("parses descending sorts and clears defaults when sort param present", () => {
		const state = parseSearchIntoState("sort=-createdAt", schema);
		expect(state.sorts).toEqual({ updatedAt: undefined, createdAt: "desc" });
	});

	it("treats an empty sort param as all sorts cleared", () => {
		const state = parseSearchIntoState("sort=", schema);
		expect(state.sorts).toEqual({ updatedAt: undefined, createdAt: undefined });
	});

	it("ignores filter params not in the schema", () => {
		const state = parseSearchIntoState("filter[unknown]=x", schema);
		expect(state.filters.unknown).toBeUndefined();
	});

	it("parses grouped OR filters in index order", () => {
		const state = parseSearchIntoState(
			"filter[or][1][isDeleted]=0&filter[or][0][title:ilike]=home&filter[or][0][author:in]=1,2",
			schema,
		);

		expect(state.orFilterGroups).toEqual([
			[
				{ key: "title", value: "home", operator: "ilike" },
				{ key: "author", value: [1, 2], operator: "in" },
			],
			[{ key: "isDeleted", value: false }],
		]);
	});
});

describe("stateToStorageSearch", () => {
	it("omits values equal to schema defaults", () => {
		const state = defaultQueryState(schema);
		expect(stateToStorageSearch(state, schema, "")).toBe("");
	});

	it("writes non-default values", () => {
		const state = applyParams(defaultQueryState(schema), schema, {
			filters: { title: "hello", isDeleted: false },
			pagination: { page: 2, perPage: 20 },
		});
		const params = new URLSearchParams(stateToStorageSearch(state, schema, ""));
		expect(params.get("filter[title]")).toBe("hello");
		expect(params.get("filter[isDeleted]")).toBe("0");
		expect(params.get("page")).toBe("2");
		expect(params.get("perPage")).toBe("20");
	});

	it("keeps raw default-operator filters in their compact storage form", () => {
		const state = applyParams(defaultQueryState(schema), schema, {
			filters: { author: [1, 2] },
		});
		const params = new URLSearchParams(stateToStorageSearch(state, schema, ""));
		expect(params.get("filter[author]")).toBe("1,2");
		expect(params.get("filter[author:in]")).toBeNull();
	});

	it("preserves explicitly selected default operators in storage", () => {
		const state = applyParams(defaultQueryState(schema), schema, {
			filters: { author: { value: [1, 2], operator: "in" } },
		});
		const params = new URLSearchParams(stateToStorageSearch(state, schema, ""));
		expect(params.get("filter[author]")).toBeNull();
		expect(params.get("filter[author:in]")).toBe("1,2");
	});

	it("preserves explicit operator-only state in storage", () => {
		const state = applyParams(defaultQueryState(schema), schema, {
			filters: { author: { value: [], operator: "in" } },
		});
		const params = new URLSearchParams(stateToStorageSearch(state, schema, ""));
		expect(params.get("filter[author:in]")).toBe("");
	});

	it("writes an explicit empty sort when a default sort is cleared", () => {
		const state = applyParams(
			defaultQueryState(schema),
			schema,
			{ sorts: { updatedAt: undefined } },
			{ singleSort: true },
		);
		const params = new URLSearchParams(stateToStorageSearch(state, schema, ""));
		expect(params.get("sort")).toBe("");
	});

	it("preserves params the hook does not own", () => {
		const state = defaultQueryState(schema);
		const search = stateToStorageSearch(
			state,
			schema,
			"foo=bar&sort=-createdAt",
		);
		const params = new URLSearchParams(search);
		expect(params.get("foo")).toBe("bar");
		expect(params.get("sort")).toBeNull();
	});

	it("round-trips through parseSearchIntoState", () => {
		const state = applyParams(defaultQueryState(schema), schema, {
			filters: { title: "hi", author: [3, 4] },
			orFilterGroups: [[{ key: "isDeleted", value: false }]],
			sorts: { createdAt: "asc" },
			pagination: { page: 5, perPage: 20 },
		});
		const search = stateToStorageSearch(state, schema, "");
		expect(statesEqual(parseSearchIntoState(search, schema), state)).toBe(true);
	});

	it("serialises grouped OR filters to storage", () => {
		const state = applyParams(defaultQueryState(schema), schema, {
			orFilterGroups: [
				[
					{ key: "title", value: "home", operator: "ilike" },
					{ key: "author", value: [1, 2], operator: "in" },
				],
				[{ key: "isDeleted", value: false }],
			],
		});
		const params = new URLSearchParams(stateToStorageSearch(state, schema, ""));

		expect(params.get("filter[or][0][title:ilike]")).toBe("home");
		expect(params.get("filter[or][0][author:in]")).toBe("1,2");
		expect(params.get("filter[or][1][isDeleted]")).toBe("0");
	});

	it("round-trips repeated fields when their operators differ", () => {
		const state = applyParams(defaultQueryState(schema), schema, {
			orFilterGroups: [
				[
					{ key: "title", value: "home", operator: "like" },
					{ key: "title", value: "archive", operator: "not like" },
				],
			],
		});
		const search = stateToStorageSearch(state, schema, "");
		const params = new URLSearchParams(search);

		expect(params.get("filter[or][0][title:like]")).toBe("home");
		expect(params.get("filter[or][0][title:not like]")).toBe("archive");
		expect(parseSearchIntoState(search, schema).orFilterGroups).toEqual(
			state.orFilterGroups,
		);
	});
});

describe("buildQueryString", () => {
	it("serialises operators as filter[key:operator]", () => {
		const state = applyParams(defaultQueryState(schema), schema, {
			filters: { author: [1, 2] },
		});
		const params = new URLSearchParams(buildQueryString(state, schema));
		expect(params.get("filter[author:in]")).toBe("1,2");
	});

	it("serialises filters without operator as filter[key]", () => {
		const state = applyParams(defaultQueryState(schema), schema, {
			filters: { title: "hello" },
		});
		const params = new URLSearchParams(buildQueryString(state, schema));
		expect(params.get("filter[title]")).toBe("hello");
	});

	it("serialises booleans as 1/0", () => {
		const state = applyParams(defaultQueryState(schema), schema, {
			filters: { isDeleted: true },
		});
		expect(
			new URLSearchParams(buildQueryString(state, schema)).get(
				"filter[isDeleted]",
			),
		).toBe("1");
	});

	it("omits empty filters and always includes pagination", () => {
		const params = new URLSearchParams(
			buildQueryString(defaultQueryState(schema), schema),
		);
		expect(params.get("filter[title]")).toBeNull();
		expect(params.get("page")).toBe("1");
		expect(params.get("perPage")).toBe("10");
		expect(params.get("sort")).toBe("-updatedAt");
	});

	it("serialises grouped OR filters to the API query string", () => {
		const state = applyParams(defaultQueryState(schema), schema, {
			orFilterGroups: [[{ key: "title", value: "home", operator: "ilike" }]],
		});
		const params = new URLSearchParams(buildQueryString(state, schema));

		expect(params.get("filter[or][0][title:ilike]")).toBe("home");
		expect(params.get("page")).toBe("1");
		expect(params.get("perPage")).toBe("10");
	});
});

describe("applyParams", () => {
	it("clears other sorts when singleSort is enabled", () => {
		const state = applyParams(
			defaultQueryState(schema),
			schema,
			{ sorts: { createdAt: "asc" } },
			{ singleSort: true },
		);
		expect(state.sorts).toEqual({ updatedAt: undefined, createdAt: "asc" });
	});

	it("merges sorts when singleSort is disabled", () => {
		const state = applyParams(defaultQueryState(schema), schema, {
			sorts: { createdAt: "asc" },
		});
		expect(state.sorts).toEqual({ updatedAt: "desc", createdAt: "asc" });
	});

	it("resets omitted pagination fields to schema defaults", () => {
		const initial = applyParams(defaultQueryState(schema), schema, {
			pagination: { page: 4, perPage: 40 },
		});
		const next = applyParams(initial, schema, { pagination: { perPage: 20 } });
		expect(next.pagination).toEqual({ page: 1, perPage: 20 });
	});

	it("normalises filter values through their codec", () => {
		const state = applyParams(defaultQueryState(schema), schema, {
			filters: { author: "5", isDeleted: "1" },
		});
		//* a scalar programmatic value is wrapped into an array (type preserved);
		//* numeric coercion only happens when parsing from the URL
		expect(state.filters.author?.value).toEqual(["5"]);
		expect(state.filters.isDeleted?.value).toBe(true);
	});

	it("accepts explicit filter operator metadata", () => {
		const state = applyParams(defaultQueryState(schema), schema, {
			filters: { author: { value: [5], operator: "notIn" } },
		});
		expect(state.filters.author).toMatchObject({
			value: [5],
			operator: "notIn",
			operatorExplicit: true,
		});
	});

	it("accepts grouped OR filters", () => {
		const state = applyParams(defaultQueryState(schema), schema, {
			orFilterGroups: [
				[
					{ key: "title", value: "home", operator: "ilike" },
					{ key: "author", value: [1, 2], operator: "in" },
				],
			],
		});

		expect(state.orFilterGroups).toEqual([
			[
				{ key: "title", value: "home", operator: "ilike" },
				{ key: "author", value: [1, 2], operator: "in" },
			],
		]);
	});

	it("preserves an existing explicit operator when raw values change", () => {
		const initial = applyParams(defaultQueryState(schema), schema, {
			filters: { author: { value: [1], operator: "notIn" } },
		});
		const next = applyParams(initial, schema, {
			filters: { author: [2] },
		});
		expect(next.filters.author).toMatchObject({
			value: [2],
			operator: "notIn",
			operatorExplicit: true,
		});
	});
});

describe("reset and default comparison", () => {
	it("resetFiltersState returns filters to schema defaults", () => {
		const applied = applyParams(defaultQueryState(schema), schema, {
			filters: { title: "x", author: [1] },
		});
		const reset = resetFiltersState(applied, schema);
		expect(statesEqual(reset, defaultQueryState(schema))).toBe(true);
	});

	it("hasFiltersApplied reflects non-empty filters", () => {
		const state = defaultQueryState(schema);
		expect(hasFiltersApplied(state, schema)).toBe(false);
		const applied = applyParams(state, schema, {
			filters: { isDeleted: false },
		});
		expect(hasFiltersApplied(applied, schema)).toBe(true);
	});

	it("hasDefaultFiltersApplied compares against schema defaults", () => {
		const withDefault: QueryStateSchema = {
			filters: { title: textFilter({ defaultValue: "hello" }) },
		};
		const state = defaultQueryState(withDefault);
		expect(hasDefaultFiltersApplied(state, withDefault)).toBe(true);
		const changed = applyParams(state, withDefault, {
			filters: { title: "other" },
		});
		expect(hasDefaultFiltersApplied(changed, withDefault)).toBe(false);
	});

	it("hasDefaultFiltersApplied treats explicit operator state as non-default", () => {
		const state = applyParams(defaultQueryState(schema), schema, {
			filters: { author: { value: [], operator: "in" } },
		});
		expect(hasDefaultFiltersApplied(state, schema)).toBe(false);
	});
});
