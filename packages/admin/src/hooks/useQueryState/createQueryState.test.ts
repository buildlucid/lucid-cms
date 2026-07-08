import { createRoot, createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import {
	arrayFilter,
	booleanFilter,
	pagination,
	sort,
	textFilter,
} from "./codecs";
import createQueryState from "./createQueryState";
import type { QueryStateSchema, QueryStateStorageAdapter } from "./types";

const buildSchema = (): QueryStateSchema => ({
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
});

//* mimics browser search-param storage with a reactive signal so back/forward
//* navigation can be simulated by writing to the signal directly
const createTestUrlAdapter = (
	initial = "",
): QueryStateStorageAdapter & { set: (search: string) => void } => {
	const [get, set] = createSignal(initial);
	return {
		search: get,
		write: set,
		set,
	};
};

describe("createQueryState - memory mode", () => {
	it("is ready immediately and exposes schema defaults", () => {
		createRoot((dispose) => {
			const query = createQueryState({
				schema: buildSchema(),
				adapter: createTestUrlAdapter(),
			});

			expect(query.ready()).toBe(true);
			expect(query.filters().get("title")).toBe("");
			expect(query.filterStates().get("author")).toEqual({
				value: [],
				operator: "in",
			});
			expect(query.getFilter("author")).toEqual({
				value: [],
				operator: "in",
			});
			expect(query.sorts().get("updatedAt")).toBe("desc");
			expect(query.pagination()).toEqual({ page: 1, perPage: 10 });
			dispose();
		});
	});

	it("setFilter updates canonical state and query string", () => {
		createRoot((dispose) => {
			const query = createQueryState({
				schema: buildSchema(),
				adapter: createTestUrlAdapter(),
			});

			query.setFilter("title", "hello");
			expect(query.filters().get("title")).toBe("hello");
			expect(query.hasFiltersApplied()).toBe(true);
			expect(
				new URLSearchParams(query.queryString()).get("filter[title]"),
			).toBe("hello");
			dispose();
		});
	});

	it("builds the same query string as URL mode", () => {
		createRoot((dispose) => {
			const schema = buildSchema();
			const memory = createQueryState({
				schema,
				adapter: createTestUrlAdapter(),
			});
			const url = createQueryState({
				schema: buildSchema(),
				adapter: createTestUrlAdapter(),
			});

			memory.setParams({
				filters: { author: [1, 2] },
				pagination: { page: 3 },
			});
			url.setParams({ filters: { author: [1, 2] }, pagination: { page: 3 } });

			expect(memory.queryString()).toBe(url.queryString());
			expect(
				new URLSearchParams(memory.queryString()).get("filter[author:in]"),
			).toBe("1,2");
			dispose();
		});
	});

	it("setFilter accepts explicit operator metadata", () => {
		createRoot((dispose) => {
			const adapter = createTestUrlAdapter();
			const query = createQueryState({
				schema: buildSchema(),
				adapter,
			});

			query.setFilter("author", { value: [1, 2], operator: "in" });
			expect(query.filters().get("author")).toEqual([1, 2]);
			expect(query.getFilter("author")).toEqual({
				value: [1, 2],
				operator: "in",
			});

			const storageParams = new URLSearchParams(adapter.search());
			expect(storageParams.get("filter[author]")).toBeNull();
			expect(storageParams.get("filter[author:in]")).toBe("1,2");
			expect(
				new URLSearchParams(query.queryString()).get("filter[author:in]"),
			).toBe("1,2");
			dispose();
		});
	});

	it("setParams accepts explicit filter operator metadata", () => {
		createRoot((dispose) => {
			const adapter = createTestUrlAdapter();
			const query = createQueryState({
				schema: buildSchema(),
				adapter,
			});

			query.setParams({
				filters: { author: { value: [3, 4], operator: "notIn" } },
			});
			expect(query.filterStates().get("author")).toEqual({
				value: [3, 4],
				operator: "notIn",
			});
			expect(
				new URLSearchParams(adapter.search()).get("filter[author:notIn]"),
			).toBe("3,4");
			dispose();
		});
	});

	it("setFilterOperator updates the operator without losing the value", () => {
		createRoot((dispose) => {
			const adapter = createTestUrlAdapter();
			const query = createQueryState({
				schema: buildSchema(),
				adapter,
			});

			query.setFilter("author", [1, 2]);
			expect(new URLSearchParams(adapter.search()).get("filter[author]")).toBe(
				"1,2",
			);

			query.setFilterOperator("author", "notIn");
			expect(query.getFilter("author")).toEqual({
				value: [1, 2],
				operator: "notIn",
			});
			const params = new URLSearchParams(adapter.search());
			expect(params.get("filter[author]")).toBeNull();
			expect(params.get("filter[author:notIn]")).toBe("1,2");
			dispose();
		});
	});

	it("preserves explicit default operators even for default filter values", () => {
		createRoot((dispose) => {
			const adapter = createTestUrlAdapter();
			const query = createQueryState({
				schema: buildSchema(),
				adapter,
			});

			query.setFilterOperator("author", "in");
			expect(query.getFilter("author")).toEqual({
				value: [],
				operator: "in",
			});
			expect(
				new URLSearchParams(adapter.search()).get("filter[author:in]"),
			).toBe("");
			expect(query.hasFiltersApplied()).toBe(false);
			expect(query.hasDefaultFiltersApplied()).toBe(false);
			dispose();
		});
	});
});

describe("createQueryState - storage sync", () => {
	it("mirrors programmatic writes to storage, omitting defaults", () => {
		createRoot((dispose) => {
			const adapter = createTestUrlAdapter();
			const query = createQueryState({
				schema: buildSchema(),
				adapter,
			});

			query.setFilter("title", "hello");
			expect(new URLSearchParams(adapter.search()).get("filter[title]")).toBe(
				"hello",
			);

			query.clearFilter("title");
			expect(adapter.search()).toBe("");
			dispose();
		});
	});

	it("keeps raw default-operator writes in the compact URL form", () => {
		createRoot((dispose) => {
			const adapter = createTestUrlAdapter();
			const query = createQueryState({
				schema: buildSchema(),
				adapter,
			});

			query.setFilter("author", [1, 2]);
			const params = new URLSearchParams(adapter.search());
			expect(params.get("filter[author]")).toBe("1,2");
			expect(params.get("filter[author:in]")).toBeNull();
			dispose();
		});
	});

	it("hydrates initial state from storage", () => {
		createRoot((dispose) => {
			const query = createQueryState({
				schema: buildSchema(),
				adapter: createTestUrlAdapter("filter[title]=hi&page=2"),
			});

			expect(query.filters().get("title")).toBe("hi");
			expect(query.pagination().page).toBe(2);
			dispose();
		});
	});

	it("rehydrates on external navigation (back/forward)", async () => {
		//* external navigation is picked up by a reactive effect (as it would be
		//* when the router updates location.search), so we flush effects between steps
		const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
		let dispose = () => {};
		const adapter = createTestUrlAdapter();
		const query = createRoot((disposeFn) => {
			dispose = disposeFn;
			return createQueryState({ schema: buildSchema(), adapter });
		});

		query.setFilter("title", "hello");
		await tick();
		expect(query.filters().get("title")).toBe("hello");

		//* simulate the browser navigating back to an earlier URL
		adapter.set("filter[title]=older");
		await tick();
		expect(query.filters().get("title")).toBe("older");

		//* simulate navigating back to the empty initial URL
		adapter.set("");
		await tick();
		expect(query.filters().get("title")).toBe("");
		dispose();
	});

	it("does not let a stale storage value overwrite its own recent write", () => {
		createRoot((dispose) => {
			const adapter = createTestUrlAdapter();
			const query = createQueryState({
				schema: buildSchema(),
				adapter,
			});

			//* the write the hook makes should be recognised as its own
			query.setFilter("title", "hello");
			expect(query.filters().get("title")).toBe("hello");
			expect(new URLSearchParams(adapter.search()).get("filter[title]")).toBe(
				"hello",
			);
			dispose();
		});
	});
});

describe("createQueryState - sorts and pagination", () => {
	it("respects single-sort by clearing other sorts", () => {
		createRoot((dispose) => {
			const query = createQueryState({
				schema: buildSchema(),
				options: { singleSort: true },
				adapter: createTestUrlAdapter(),
			});

			query.setSort("createdAt", "asc");
			expect(query.sorts().get("createdAt")).toBe("asc");
			expect(query.sorts().get("updatedAt")).toBeUndefined();
			dispose();
		});
	});

	it("merges sorts when single-sort is disabled", () => {
		createRoot((dispose) => {
			const query = createQueryState({
				schema: buildSchema(),
				adapter: createTestUrlAdapter(),
			});

			query.setSort("createdAt", "asc");
			expect(query.sorts().get("createdAt")).toBe("asc");
			expect(query.sorts().get("updatedAt")).toBe("desc");
			dispose();
		});
	});

	it("setPerPage resets to the first page", () => {
		createRoot((dispose) => {
			const query = createQueryState({
				schema: buildSchema(),
				adapter: createTestUrlAdapter(),
			});

			query.setPage(4);
			expect(query.pagination().page).toBe(4);
			query.setPerPage(20);
			expect(query.pagination()).toEqual({ page: 1, perPage: 20 });
			dispose();
		});
	});
});

describe("createQueryState - reset", () => {
	it("resetFilters returns filters to schema defaults and clears storage", () => {
		createRoot((dispose) => {
			const adapter = createTestUrlAdapter();
			const query = createQueryState({
				schema: buildSchema(),
				adapter,
			});

			query.setParams({ filters: { title: "x", author: [1] } });
			expect(query.hasFiltersApplied()).toBe(true);

			query.resetFilters();
			expect(query.hasDefaultFiltersApplied()).toBe(true);
			expect(query.filters().get("title")).toBe("");
			expect(query.filters().get("author")).toEqual([]);
			expect(new URLSearchParams(adapter.search()).has("filter[title]")).toBe(
				false,
			);
			dispose();
		});
	});
});

describe("createQueryState - ready() with awaitSchema", () => {
	it("stays false until setSchema is called", () => {
		createRoot((dispose) => {
			const query = createQueryState({
				schema: { sorts: { updatedAt: sort({ defaultValue: "desc" }) } },
				options: { awaitSchema: true },
				adapter: createTestUrlAdapter(),
			});

			expect(query.ready()).toBe(false);
			query.setSchema({ filters: { title: textFilter() } });
			expect(query.ready()).toBe(true);
			expect(query.filters().get("title")).toBe("");
			dispose();
		});
	});

	it("setSchema picks up storage values for newly registered filters", () => {
		createRoot((dispose) => {
			const query = createQueryState({
				schema: {},
				options: { awaitSchema: true },
				adapter: createTestUrlAdapter("filter[title]=hydrated"),
			});

			expect(query.filters().get("title")).toBeUndefined();
			query.setSchema({ filters: { title: textFilter() } });
			expect(query.filters().get("title")).toBe("hydrated");
			dispose();
		});
	});

	it("setSchema removes stale owned filter params from storage", () => {
		createRoot((dispose) => {
			const adapter = createTestUrlAdapter(
				"filter[title]=stale&filter[author:in]=1&foo=bar",
			);
			const query = createQueryState({
				schema: buildSchema(),
				adapter,
			});

			query.setSchema({
				filters: { author: arrayFilter({ defaultOperator: "in" }) },
			});

			expect(query.filters().get("title")).toBeUndefined();
			expect(query.filters().get("author")).toEqual([1]);
			const params = new URLSearchParams(adapter.search());
			expect(params.get("filter[title]")).toBeNull();
			expect(params.get("filter[author:in]")).toBe("1");
			expect(params.get("foo")).toBe("bar");
			dispose();
		});
	});
});
