import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import z from "zod";
import loadBuildProject from "../compile/load-build-project.js";
import loadConfigFile from "./load-config-file.js";

test("should return lucid config object", async () => {
	const res = await loadConfigFile({
		path: path.resolve(__dirname, "./mock-config/lucid.config.ts"),
	});

	expect(typeof res.config).toBe("object");
	expect(res.config).toBeDefined();
	expect(res.envSchema).toBeUndefined();
});

test("should return lucid adapter object", async () => {
	const res = await loadConfigFile({
		path: path.resolve(__dirname, "./mock-config/lucid.config.ts"),
	});

	expect(typeof res.adapter).toBe("object");
	expect(res.adapter).toBeDefined();
});

const withEnvironmentConfig = async (
	port: string | undefined,
	run: (configPath: string) => Promise<void>,
) => {
	const root = await mkdtemp(path.join(os.tmpdir(), "lucid-env-config-"));
	const configPath = path.join(root, "lucid.config.mjs");
	try {
		await writeFile(
			configPath,
			`
import z from ${JSON.stringify(import.meta.resolve("zod"))};
let parseCount = 0;
const binding = { get: () => "binding-value" };
export const env = z.object({
    PORT: z.string().transform(Number),
}).transform((values) => ({ ...values, PARSE_COUNT: ++parseCount }));
const describe = (values) => [typeof values.PORT, values.PORT, values.PARSE_COUNT ?? 0].join(":");
export default {
    runtime: {
        key: "test", lucid: "*",
        getEnvVars: () => ({ PORT: ${JSON.stringify(port) ?? "undefined"}, BINDING: binding }),
    },
    db: {
        adapter: "test",
        resolve: (values) => ({
            adapter: describe(values),
            connect: () => { throw new Error("Config loading must not connect to a database"); },
            inferSchema: () => {},
            dropAllTables: () => {},
        }),
    },
    config: (values) => ({
        secrets: "a".repeat(64),
        brand: { name: describe(values) },
        logger: { level: "silent" },
    }),
};
`,
		);
		await run(configPath);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
};

test("CLI config loading parses raw env once before config and database factories", async () => {
	await withEnvironmentConfig("6543", async (configPath) => {
		const result = await loadConfigFile({ path: configPath, silent: true });
		expect(result.env).toMatchObject({ PORT: 6543, PARSE_COUNT: 1 });
		expect(result.env?.BINDING).toHaveProperty("get");
		expect(result.config.brand.name).toBe("number:6543:1");
		expect(result.config.db.adapter).toBe("number:6543:1");
	});
});

test("validated build loading supplies parsed env to factories and honours schema overrides", async () => {
	await withEnvironmentConfig("6543", async (configPath) => {
		const result = await loadBuildProject({
			configPath,
			validateEnv: true,
			generateTypes: false,
			silent: true,
		});
		expect(result.loaded.config.brand.name).toBe("number:6543:1");
		expect(result.loaded.env?.PORT).toBe(6543);

		const override = await loadBuildProject({
			configPath,
			validateEnv: true,
			generateTypes: false,
			silent: true,
			envSchema: z.object({
				PORT: z.string().transform((value) => Number(value) + 1),
			}),
		});
		expect(override.loaded.config.brand.name).toBe("number:6544:0");
		expect(override.loaded.config.db.adapter).toBe("number:6544:0");
	});
});

test("build loading skips runtime env requirements unless validation is requested", async () => {
	await withEnvironmentConfig(undefined, async (configPath) => {
		const result = await loadBuildProject({
			configPath,
			generateTypes: false,
			silent: true,
		});
		expect(result.loaded.config.brand.name).toBe("undefined::0");
		await expect(
			loadConfigFile({ path: configPath, silent: true }),
		).rejects.toThrow();
		await expect(
			loadBuildProject({
				configPath,
				validateEnv: true,
				generateTypes: false,
				silent: true,
			}),
		).rejects.toThrow();
	});
});
