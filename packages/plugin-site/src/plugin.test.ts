import type {
	AdapterRuntimeContext,
	ResolvedLucidConfig,
	Translator,
} from "@lucidcms/core/types";
import { describe, expect, test } from "vitest";
import { CLEAR_CACHE_ROUTE } from "./constants.js";
import sitePlugin from "./plugin.js";

const check = (host: string) =>
	sitePlugin().checkCompatibility?.({
		runtimeContext: { host } as AdapterRuntimeContext,
		config: {} as ResolvedLucidConfig,
		translate: (() => "") as unknown as Translator,
	});

describe("site", () => {
	test("runs on Lucid's own server but not inside a hosting framework", () => {
		expect(() => check("lucid")).not.toThrow();
		expect(() => check("astro")).toThrow(/can't run inside astro/);
	});

	test("adds the clear cache route and tile unless the site is static", () => {
		const configure = (mode: "isr" | "static") => {
			const draft = {
				http: { extensions: [], routes: [] as Array<{ path: string }> },
				admin: { slots: [] as Array<{ slot: string }> },
			};
			sitePlugin({ mode }).configure?.(draft as never);
			return draft;
		};

		const isr = configure("isr");
		expect(isr.http.routes.map((route) => route.path)).toEqual([
			CLEAR_CACHE_ROUTE,
		]);
		expect(isr.admin.slots.map((slot) => slot.slot)).toEqual([
			"maintenance.action",
		]);

		const staticSite = configure("static");
		expect(staticSite.http.routes).toEqual([]);
		expect(staticSite.admin.slots).toEqual([]);
	});
});
