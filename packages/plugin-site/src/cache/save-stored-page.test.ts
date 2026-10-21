import type { ServiceContext } from "@lucidcms/core/types";
import type { IslandEntry } from "@lucidkiln/core";
import { describe, expect, test, vi } from "vitest";
import { DEFAULT_STORE_LIFETIME_SECONDS } from "../constants.js";
import saveStoredPage from "./save-stored-page.js";

const set = vi.fn();
const setMany = vi.fn();
const context = { kv: { set, setMany } } as unknown as ServiceContext;

const page = { body: "<h1>Home</h1>", contentType: "text/html", tokens: {} };
const island: IslandEntry = {
	template: "islands/cart.kiln",
	props: {},
	locale: "en",
	timeZone: "UTC",
};

describe("saveStoredPage", () => {
	test("bounds how long pages and their islands stay stored when the page has no revalidate", async () => {
		await saveStoredPage({
			context,
			key: "home",
			page,
			islands: { a: island },
			revalidate: undefined,
		});

		expect(set).toHaveBeenLastCalledWith(
			context,
			expect.objectContaining({ ttlSeconds: DEFAULT_STORE_LIFETIME_SECONDS }),
		);
		expect(setMany).toHaveBeenLastCalledWith(
			context,
			expect.objectContaining({ ttlSeconds: DEFAULT_STORE_LIFETIME_SECONDS }),
		);
	});

	test("keeps a shorter revalidate for the page and its islands", async () => {
		await saveStoredPage({
			context,
			key: "home",
			page,
			islands: { a: island },
			revalidate: 60,
		});

		expect(set).toHaveBeenLastCalledWith(
			context,
			expect.objectContaining({ ttlSeconds: 60 }),
		);
		expect(setMany).toHaveBeenLastCalledWith(
			context,
			expect.objectContaining({ ttlSeconds: 60 }),
		);
	});
});
