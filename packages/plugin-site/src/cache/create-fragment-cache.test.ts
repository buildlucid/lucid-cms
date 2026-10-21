import type { ServiceContext } from "@lucidcms/core/types";
import { describe, expect, test, vi } from "vitest";
import { DEFAULT_STORE_LIFETIME_SECONDS } from "../constants.js";
import type { SiteState } from "../types.js";
import createFragmentCache from "./create-fragment-cache.js";

const tokens: Record<string, string> = {};
const getCacheTagTokens = vi.fn(async (_context: unknown, tags: string[]) =>
	Object.fromEntries(tags.map((tag) => [tag, tokens[tag] ?? "0"])),
);

vi.mock(import("@lucidcms/core/extension"), async (importOriginal) => ({
	...(await importOriginal()),
	getCacheTagTokens: (context: unknown, tags: string[]) =>
		getCacheTagTokens(context, tags),
}));

const store = new Map<string, unknown>();
const lifetimes = new Map<string, number | undefined>();
/** Each request renders with its own context, and with it its own memo of tag tokens. */
const request = () =>
	({
		context: {
			kv: {
				get: async (_context: unknown, { key }: { key: string }) =>
					store.get(key) ?? null,
				set: async (
					_context: unknown,
					{
						key,
						value,
						ttlSeconds,
					}: { key: string; value: unknown; ttlSeconds?: number },
				) => {
					store.set(key, value);
					lifetimes.set(key, ttlSeconds);
				},
			},
		} as unknown as ServiceContext,
	}) as SiteState;

const cache = createFragmentCache();
const save = async (key: string, value: string, tags: string[]) => {
	const state = request();
	await cache.get({ key, state });
	await cache.set({ key, value, seconds: null, tags, state });
};

describe("createFragmentCache", () => {
	test("reuses a saved section until a collection it's tagged with changes", async () => {
		await save("nav", "<nav></nav>", ["content-documents:menu"]);
		await expect(cache.get({ key: "nav", state: request() })).resolves.toBe(
			"<nav></nav>",
		);

		tokens["content-documents:page"] = "1";
		tokens["content-documents"] = "1";
		await expect(cache.get({ key: "nav", state: request() })).resolves.toBe(
			"<nav></nav>",
		);

		tokens["content-documents:menu"] = "1";
		await expect(
			cache.get({ key: "nav", state: request() }),
		).resolves.toBeNull();
	});

	test("doesn't save a section when content changed while it rendered", async () => {
		const state = request();
		await cache.get({ key: "footer", state });
		tokens["content-documents"] = "2";
		await cache.set({
			key: "footer",
			value: "<footer></footer>",
			seconds: null,
			tags: [],
			state,
		});
		await expect(
			cache.get({ key: "footer", state: request() }),
		).resolves.toBeNull();
	});

	test("reads each tag's token once per request, however many sections a page has", async () => {
		const state = request();
		getCacheTagTokens.mockClear();
		await cache.get({ key: "hero", state });
		await cache.get({ key: "aside", state });
		expect(getCacheTagTokens).toHaveBeenCalledTimes(1);
	});

	test("bounds how long a section stays stored, keeping a shorter `for`", async () => {
		await save("hero", "<h1></h1>", []);
		const state = request();
		await cache.get({ key: "promo", state });
		await cache.set({
			key: "promo",
			value: "<p></p>",
			seconds: 300,
			tags: [],
			state,
		});

		expect(lifetimes.get("@lucidcms/plugin-site:fragment:hero")).toBe(
			DEFAULT_STORE_LIFETIME_SECONDS,
		);
		expect(lifetimes.get("@lucidcms/plugin-site:fragment:promo")).toBe(300);
	});
});
