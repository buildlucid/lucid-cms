import { expect, test } from "vitest";
import { hydrationId } from "../../ui/hydration-ids.js";
import listSiteFiles from "./list-site-files.js";

test("lists the site's built files with their static and dynamic imports, leaving out the rest of the client build", () => {
	const files = listSiteFiles({
		kind: "build",
		buildId: "build",
		prefix: "site/",
		manifest: {
			"site/scripts/site.ts": {
				file: "_assets/site-a1.js",
				imports: ["_shared.js"],
				dynamicImports: ["_lazy.js"],
				css: ["_assets/site-b2.css"],
			},
			"_lazy.js": { file: "_assets/lazy-j1.js" },
			// Keyed by its virtual module rather than a site path, so it's only found through the component's file.
			[hydrationId("ui/Counter.tsx")]: {
				file: "_assets/Counter-g7.js",
				dynamicImports: ["_chart.js"],
			},
			"_chart.js": { file: "_assets/chart-k2.js" },
			"_shared.js": {
				file: "_assets/shared-c3.js",
				assets: ["_assets/logo-d4.svg"],
			},
			"admin/main.tsx": { file: "_assets/admin-e5.js" },
		},
		ui: {
			script: "/_assets/client-component-f6.js",
			components: {
				"ui/Counter.tsx": {
					src: "/_assets/Counter-g7.js",
					preload: ["/_assets/runtime-h8.js"],
					css: ["/_assets/Counter-i9.css"],
				},
			},
			styles: {},
		},
	});

	expect([...files].sort()).toEqual([
		"_assets/Counter-g7.js",
		"_assets/Counter-i9.css",
		"_assets/chart-k2.js",
		"_assets/client-component-f6.js",
		"_assets/lazy-j1.js",
		"_assets/logo-d4.svg",
		"_assets/runtime-h8.js",
		"_assets/shared-c3.js",
		"_assets/site-a1.js",
		"_assets/site-b2.css",
	]);
});
