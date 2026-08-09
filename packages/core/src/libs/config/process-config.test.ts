import { expect, test, vi } from "vitest";
import z from "zod";
import type { LucidConfig } from "../../types/config.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import { defineTable } from "../db/client/table/definition.js";
import processConfig from "./process-config.js";

const createAdapter = (adapter: string) =>
	({
		adapter,
		connect: vi.fn(),
		inferSchema: vi.fn(),
		dropAllTables: vi.fn(),
	}) as unknown as DatabaseAdapter;

const config: LucidConfig = {
	collections: [],
	plugins: [],
};

test("processes each config independently", async () => {
	const requestAdapter = createAdapter("request");
	const runtimeAdapter = createAdapter("runtime");

	await processConfig(config, {
		resolvedDb: requestAdapter,
		skipValidation: true,
	});
	const cached = await processConfig(config, {
		resolvedDb: runtimeAdapter,
		skipValidation: true,
	});

	expect(cached.db).toBe(runtimeAdapter);
	expect(cached.tables).toEqual([]);
	expect(cached.telemetry).toBe(true);
});

test("applies plugin recipes during fresh config processing", async () => {
	const init = vi.fn(async () => ({
		data: undefined,
		error: undefined,
	}));
	const pluginTable = defineTable<{ value: string }>("plugin_config", {
		columns: {
			value: {
				schema: z.string(),
				type: "text",
			},
		},
	});
	const processed = await processConfig(
		{
			...config,
			plugins: [
				{
					key: "test-plugin",
					lucid: "*",
					hooks: { init },
					recipe: (draft) => {
						draft.tables.push(pluginTable);
						draft.contentRoutes.push({
							key: "pages",
							collectionKey: "pages",
							path: { field: "slug" },
						});
						draft.brand = {
							...draft.brand,
							name: "Configured by plugin",
						};
					},
				},
			],
		},
		{
			resolvedDb: createAdapter("request"),
			skipValidation: true,
		},
	);

	expect(init).toHaveBeenCalledOnce();
	expect(processed.tables).toEqual([pluginTable]);
	expect(processed.contentRoutes).toEqual([
		{
			key: "pages",
			collectionKey: "pages",
			path: { field: "slug" },
		},
	]);
	expect(processed.brand.name).toBe("Configured by plugin");
});
