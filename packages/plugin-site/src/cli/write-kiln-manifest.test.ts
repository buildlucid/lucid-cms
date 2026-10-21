import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import { expect, test } from "vitest";
import resolvePluginOptions from "../site/resolve-plugin-options.js";
import resolveIntegrations from "./ui/resolve-integrations.js";
import writeKilnManifest from "./write-kiln-manifest.js";

const config = {
	localization: { locales: [{ code: "en" }], defaultLocale: "en" },
	collections: [],
} as unknown as ResolvedLucidConfig;

test("lists built-in and project functions without loading the site", async () => {
	const root = await mkdtemp(path.join(tmpdir(), "lucid-site-"));
	try {
		await writeKilnManifest({
			root,
			config,
			options: resolvePluginOptions({
				kiln: { functions: { greet: () => "hi" } },
			}),
			ui: null,
		});
		const manifest = JSON.parse(
			await readFile(path.join(root, "kiln.json"), "utf8"),
		);
		expect(manifest.root).toBe(".");
		expect(manifest.functions).toEqual(
			expect.arrayContaining(["document", "greet"]),
		);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("lists UI components with their props and the client prop", async () => {
	const root = await mkdtemp(path.join(tmpdir(), "lucid-site-"));
	const integration = (name: string, include?: string[], props?: string) => ({
		name,
		extensions: [".tsx"],
		include,
		props,
		server: `${name}/server`,
		client: `${name}/client`,
	});
	try {
		await writeKilnManifest({
			root,
			config,
			options: resolvePluginOptions({}),
			ui: resolveIntegrations([
				integration("react", undefined, "Props<$file>"),
				integration("solid", ["components/solid/**"]),
			]),
		});
		const { components } = JSON.parse(
			await readFile(path.join(root, "kiln.json"), "utf8"),
		);
		const client =
			'{ client?: "load" | "idle" | "visible" | "only" | { media: string } }';
		expect(components).toEqual([
			{
				extensions: [".tsx"],
				exclude: ["components/solid/**"],
				props: `(Props<$file>) & ${client}`,
			},
			{ extensions: [".tsx"], include: ["components/solid/**"], props: client },
		]);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
