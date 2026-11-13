import { expect, test } from "vitest";
import renderSiteModule from "./render-site-module.js";

/** A development site module with the given component globs. */
const render = (componentGlobs: string[]) =>
	renderSiteModule({
		data: { kind: "dev", prefix: "site/", revision: "1", publicFiles: [] },
		base: "/site/",
		templateQuery: "?lucid-site-template",
		components: [],
		renderers: [],
		componentGlobs,
	});

test("watches component files only when UI integrations give globs, as Vite rejects an empty list", () => {
	expect(render([])).not.toContain("import.meta.glob([");
	expect(render(["/site/**/*.tsx"])).toContain(
		'import.meta.glob(["/site/**/*.tsx"]);',
	);
});
