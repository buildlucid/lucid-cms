import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ResolvedLucidConfig, ServiceContext } from "@lucidcms/core/types";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import createSiteLoader from "./create-site-loader.js";

const config = {
	localization: { locales: [{ code: "en" }], defaultLocale: "en" },
	collections: [],
} as unknown as ResolvedLucidConfig;

const contextFor = (compiled: boolean) =>
	({
		runtimeContext: { compiled },
		translate: { scopeBundles: () => ({}), lookup: () => undefined },
	}) as unknown as ServiceContext;

let directory: string;
beforeAll(async () => {
	directory = await mkdtemp(path.join(tmpdir(), "plugin-site-"));
	await writeFile(path.join(directory, "index.kiln"), "Home");
});
afterAll(() => rm(directory, { recursive: true, force: true }));

describe("createSiteLoader", () => {
	test("keeps the development site until a file's size or time changes", async () => {
		const getSite = createSiteLoader(
			{
				directory,
				mode: "ssr",
				trailingSlash: "never",
				static: { outDir: "dist-site" },
			},
			config,
		);
		const context = contextFor(false);

		const first = await getSite({ context });
		await expect(getSite({ context })).resolves.toBe(first);

		await writeFile(path.join(directory, "index.kiln"), "Home!");
		const second = await getSite({ context });
		expect(second).not.toBe(first);
		expect(second.cacheNamespace).not.toBe(first.cacheNamespace);
		await expect(getSite({ context })).resolves.toBe(second);
	});

	test("refuses to serve a built server that has no built site", async () => {
		const getSite = createSiteLoader(
			{
				directory,
				mode: "ssr",
				trailingSlash: "never",
				static: { outDir: "dist-site" },
			},
			config,
		);

		await expect(getSite({ context: contextFor(true) })).rejects.toThrow(
			/Run lucidcms build/,
		);
	});
});
