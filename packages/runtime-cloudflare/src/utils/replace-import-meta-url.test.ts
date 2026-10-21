import { parseAst } from "rolldown/parseAst";
import { describe, expect, test } from "vitest";
import replaceImportMetaUrl from "./replace-import-meta-url.js";

const replace = (code: string) =>
	replaceImportMetaUrl(code, parseAst(code), '"file:///server.js"');

describe("replaceImportMetaUrl", () => {
	test("replaces the expression and leaves strings that mention it", () => {
		expect(
			replace(
				// biome-ignore lint/suspicious/noTemplateCurlyInString: the code under test holds a template literal
				'const a = createRequire(import.meta.url); const b = "new URL(url, import.meta.url)"; const c = `${import.meta.url} import.meta.url`;',
			),
		).toBe(
			// biome-ignore lint/suspicious/noTemplateCurlyInString: the code under test holds a template literal
			'const a = createRequire("file:///server.js"); const b = "new URL(url, import.meta.url)"; const c = `${"file:///server.js"} import.meta.url`;',
		);
	});

	test("leaves other import.meta properties alone", () => {
		expect(replace("const env = import.meta.env;")).toBe(
			"const env = import.meta.env;",
		);
	});
});
