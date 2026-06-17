import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import prepareConfigArtifacts from "./prepare-config-artifacts.js";

test("splits lucid config into isolated config, db, runtime, and env artifacts", async () => {
	const tempDir = await mkdtemp(path.join(tmpdir(), "lucid-config-artifacts-"));
	const configPath = path.join(tempDir, "lucid.config.ts");

	await writeFile(
		configPath,
		`import { configureLucid, z } from "@lucidcms/core";
import { node } from "@lucidcms/node-adapter";
import PagesPlugin from "@lucidcms/plugin-pages";
import { libsql } from "@lucidcms/libsql-adapter";
import PageCollection from "./src/collections/pages.js";

const makePlugins = () => [PagesPlugin()];
const runtime = node;
const db = libsql;
const config = (env) => ({
	secrets: {
		encryption: env.SECRET,
		cookie: env.SECRET,
		refreshToken: env.SECRET,
		accessToken: env.SECRET,
	},
	collections: [PageCollection],
	plugins: makePlugins(),
});

export const env = z.object({
	LIBSQL_URL: z.string(),
	LIBSQL_AUTH_TOKEN: z.string().optional(),
	SECRET: z.string(),
});

export default configureLucid({ runtime, db, config });
`,
	);
	const outputPath = path.join(tempDir, "dist");

	try {
		const artifacts = await prepareConfigArtifacts({
			configPath,
			outputPath,
		});
		const [config, db, runtime, envArtifact] = await Promise.all([
			readFile(artifacts.config, "utf-8"),
			readFile(artifacts.db, "utf-8"),
			readFile(artifacts.runtime, "utf-8"),
			readFile(artifacts.env, "utf-8"),
		]);

		expect(config).toContain("@lucidcms/plugin-pages");
		expect(config).toContain("../../src/collections/pages.js");
		expect(config).toContain("const config =");
		expect(config).toContain("makePlugins");
		expect(config).not.toContain("@lucidcms/libsql-adapter");
		expect(config).not.toContain("@lucidcms/node-adapter");

		expect(db).toContain("@lucidcms/libsql-adapter");
		expect(db).toContain("const db =");
		expect(db).toContain("libsql");
		expect(db).not.toContain("@lucidcms/plugin-pages");
		expect(db).not.toContain("@lucidcms/node-adapter");

		expect(runtime).toContain("@lucidcms/node-adapter/runtime");
		expect(runtime).toContain("const runtime =");
		expect(runtime).toContain("node");
		expect(runtime).not.toContain('@lucidcms/node-adapter";');
		expect(runtime).not.toContain("@lucidcms/libsql-adapter");

		expect(envArtifact).toContain('import { z } from "@lucidcms/core";');
		expect(envArtifact).toContain("export const env = z.object");
		expect(envArtifact).toContain("LIBSQL_URL");
		expect(envArtifact).toContain("LIBSQL_AUTH_TOKEN");
		expect(envArtifact).not.toContain("configureLucid");
		expect(envArtifact).not.toContain("@lucidcms/libsql-adapter");
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});
