import type {
	AdapterRuntimeContext,
	ResolvedLucidConfig,
	Translator,
} from "@lucidcms/core/types";
import { describe, expect, test } from "vitest";
import sitePlugin from "./plugin.js";

const check = (host: string) =>
	sitePlugin().checkCompatibility?.({
		runtimeContext: { host } as AdapterRuntimeContext,
		config: {} as ResolvedLucidConfig,
		translate: (() => "") as unknown as Translator,
	});

describe("sitePlugin", () => {
	test("runs on Lucid's own server but not inside a hosting framework", () => {
		expect(() => check("lucid")).not.toThrow();
		expect(() => check("astro")).toThrow(/can't run inside astro/);
	});
});
