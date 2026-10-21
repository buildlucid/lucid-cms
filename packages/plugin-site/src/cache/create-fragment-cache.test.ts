import type { ServiceContext } from "@lucidcms/core/types";
import { describe, expect, test, vi } from "vitest";
import { DEFAULT_STORE_LIFETIME_SECONDS } from "../constants.js";
import createFragmentCache from "./create-fragment-cache.js";

const tokens: Record<string, string> = {};

vi.mock(import("@lucidcms/core/extension"), async (importOriginal) => ({
	...(await importOriginal()),
	getCacheTagTokens: async (_context, tags) =>
		Object.fromEntries(tags.map((tag) => [tag, tokens[tag] ?? "0"])),
}));

const store = new Map<string, unknown>();
const lifetimes = new Map<string, number | undefined>();
const context = {
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
} as unknown as ServiceContext;

const cache = createFragmentCache(context);
const save = async (key: string, value: string, tags: string[]) => {
	await cache.get({ key });
	await cache.set({ key, value, seconds: null, tags });
};

describe("createFragmentCache", () => {
	test("reuses a saved section until a collection it's tagged with changes", async () => {
		await save("nav", "<nav></nav>", ["content-documents:menu"]);
		await expect(cache.get({ key: "nav" })).resolves.toBe("<nav></nav>");

		tokens["content-documents:page"] = "1";
		tokens["content-documents"] = "1";
		await expect(cache.get({ key: "nav" })).resolves.toBe("<nav></nav>");

		tokens["content-documents:menu"] = "1";
		await expect(cache.get({ key: "nav" })).resolves.toBeNull();
	});

	test("doesn't save a section when content changed while it rendered", async () => {
		await cache.get({ key: "footer" });
		tokens["content-documents"] = "2";
		await cache.set({
			key: "footer",
			value: "<footer></footer>",
			seconds: null,
			tags: [],
		});
		await expect(cache.get({ key: "footer" })).resolves.toBeNull();
	});

	test("bounds how long a section stays stored, keeping a shorter `for`", async () => {
		await save("hero", "<h1></h1>", []);
		await cache.get({ key: "promo" });
		await cache.set({ key: "promo", value: "<p></p>", seconds: 300, tags: [] });

		expect(lifetimes.get("@lucidcms/plugin-site:fragment:hero")).toBe(
			DEFAULT_STORE_LIFETIME_SECONDS,
		);
		expect(lifetimes.get("@lucidcms/plugin-site:fragment:promo")).toBe(300);
	});
});
