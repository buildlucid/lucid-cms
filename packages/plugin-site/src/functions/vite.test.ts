import { createKiln, memoryCache, memoryLoader } from "@lucidkiln/core";
import { describe, expect, test } from "vitest";
import propTypes from "../content/prop-types.js";
import type { SiteCliData, SiteState } from "../types.js";
import createViteFunction from "./vite.js";

const dev: SiteCliData = { kind: "dev", directory: "/site", vite: true };

const render = (data: SiteCliData | null, source: string) =>
	createKiln<SiteState>({
		loader: memoryLoader({ "page.kiln": source }),
		functions: { vite: createViteFunction(data) },
		types: propTypes,
	}).render("page.kiln", {}, { state: {} as SiteState });

describe("vite()", () => {
	test("links Vite's client and the source files in development, once per call", async () => {
		await expect(
			render(
				dev,
				'{{ vite("styles/site.css", "scripts/site.ts", "./scripts/site.ts") }}',
			),
		).resolves.toBe(
			'<script type="module" src="/_assets/@vite/client"></script><link rel="stylesheet" href="/_assets/styles/site.css"><script type="module" src="/_assets/scripts/site.ts"></script>',
		);
	});

	test("keeps a cached section's tags when another page wrote them first", async () => {
		const kiln = createKiln<SiteState>({
			loader: memoryLoader({
				"a.kiln": '{{ vite("scripts/widget.ts") }}|{% include "widget" %}',
				"b.kiln": '{% include "widget" %}',
				"widget.kiln":
					'{% cache "widget" %}{{ vite("scripts/widget.ts") }}{% endcache %}',
			}),
			functions: { vite: createViteFunction(dev) },
			types: propTypes,
			cache: memoryCache(),
		});
		const state = {} as SiteState;

		await kiln.render("a.kiln", {}, { state });
		await expect(kiln.render("b.kiln", {}, { state })).resolves.toContain(
			"/_assets/scripts/widget.ts",
		);
	});

	test("writes built files from the manifest, with imported chunks' stylesheets and preloads", async () => {
		const data: SiteCliData = {
			kind: "build",
			buildId: "build",
			templates: {},
			manifest: {
				"styles/site.css": { file: "site-a1.css", isEntry: true },
				"scripts/site.ts": {
					file: "site-b2.js",
					isEntry: true,
					imports: ["_shared.js"],
				},
				"_shared.js": { file: "shared-c3.js", css: ["shared-d4.css"] },
			},
		};

		await expect(
			render(data, '{{ vite("styles/site.css", "scripts/site.ts") }}'),
		).resolves.toBe(
			'<link rel="stylesheet" href="/_assets/site-a1.css"><link rel="stylesheet" href="/_assets/shared-d4.css"><script type="module" src="/_assets/site-b2.js"></script><link rel="modulepreload" href="/_assets/shared-c3.js">',
		);
	});

	test("adds attrs to every tag, leaving out false values", async () => {
		await expect(
			render(
				dev,
				'{{ vite("scripts/site.ts", attrs: { nonce: "abc", async: true, defer: false }) }}',
			),
		).resolves.toBe(
			'<script type="module" src="/_assets/@vite/client" nonce="abc" async></script><script type="module" src="/_assets/scripts/site.ts" nonce="abc" async></script>',
		);
	});

	test("finds entries written as relative or root paths in the build", async () => {
		await expect(
			render(
				{
					kind: "build",
					buildId: "build",
					templates: {},
					manifest: { "styles/site.css": { file: "site-a1.css" } },
				},
				'{{ vite("./styles/site.css", "/styles/site.css") }}',
			),
		).resolves.toBe('<link rel="stylesheet" href="/_assets/site-a1.css">');
	});

	test("fails for entries the build doesn't have", async () => {
		await expect(
			render(
				{ kind: "build", buildId: "build", templates: {}, manifest: null },
				'{{ vite("scripts/site.ts") }}',
			),
		).rejects.toThrow(/isn't in the site's Vite build/);
	});
});
