import { expect, test, vi } from "vitest";
import type { LucidConfig } from "../../types/config.js";
import type DatabaseAdapter from "../db/adapter-base.js";
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
});

test("applies plugin recipes during fresh config processing", async () => {
	const init = vi.fn(async () => ({
		data: undefined,
		error: undefined,
	}));
	const processed = await processConfig(
		{
			...config,
			plugins: [
				{
					key: "test-plugin",
					lucid: "*",
					hooks: { init },
					recipe: (draft) => {
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
	expect(processed.brand.name).toBe("Configured by plugin");
});
