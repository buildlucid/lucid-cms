// @vitest-environment node

import {
	mkdir,
	mkdtemp,
	readdir,
	realpath,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createBuilder } from "vite";
import { expect, test } from "vitest";
import type { SitePublicFile } from "../../types.js";
import siteClientBuildPlugin from "./site-client-build-plugin.js";
import type { SiteViteContext } from "./types.js";

/** Builds the client environment of a site whose only template is `template`, as `site:build` does without the admin. */
const buildSite = async (
	template: string,
	files: Record<string, string>,
	publicFiles: SitePublicFile[] = [],
) => {
	const root = await realpath(
		await mkdtemp(path.join(tmpdir(), "lucid-site-")),
	);
	await mkdir(path.join(root, "site/pages"), { recursive: true });
	await writeFile(path.join(root, "site/pages/index.kiln"), template);
	for (const [name, source] of Object.entries(files)) {
		await writeFile(path.join(root, "site", name), source);
	}
	const context: SiteViteContext = {
		root: path.join(root, "site"),
		ui: null,
		extensions: [],
		runtime: "node",
		publicFiles,
		prefix: "site/",
		viteRoot: root,
		clientBuild: null,
	};
	try {
		const builder = await createBuilder({
			root,
			configFile: false,
			logLevel: "silent",
			appType: "custom",
			// As Lucid's builds do, so the config resolves once.
			builder: { sharedConfigBuild: true },
			plugins: [siteClientBuildPlugin(context)],
		});
		const { client } = builder.environments;
		if (!client) throw new Error("Expected Vite's client environment.");
		await builder.build(client);
		return {
			clientBuild: context.clientBuild,
			files: (
				await readdir(path.join(root, "dist"), {
					recursive: true,
					withFileTypes: true,
				})
			)
				.filter((entry) => entry.isFile())
				.map((entry) => entry.name),
		};
	} finally {
		await rm(root, { recursive: true, force: true });
	}
};

test("builds sites whose templates name no browser files", async () => {
	const { clientBuild, files } = await buildSite("<h1>Home</h1>", {});

	expect(clientBuild?.data.manifest).toEqual({});
	expect(files).toEqual([]);
});

test("builds sites whose templates only name single files", async () => {
	const { clientBuild, files } = await buildSite(
		'<img src="{{ viteAsset("logo.svg") }}">',
		{ "logo.svg": "<svg></svg>" },
	);

	const logo = clientBuild?.data.manifest["site/logo.svg"]?.file;
	expect(logo).toMatch(/^assets\/logo-.+\.svg$/);
	expect(files).toEqual([path.basename(logo ?? "")]);
});

test("stops a build whose page shares a path with a public file", async () => {
	await expect(
		buildSite("<h1>Home</h1>", {}, [
			{ path: "/index.html", file: "public/index.html" },
		]),
	).rejects.toThrow(
		"'/index.html': 'pages/index.kiln' and 'public/index.html'",
	);
});
