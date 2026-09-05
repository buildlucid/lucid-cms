import { resolveConfigDefinition } from "@lucidcms/core/build";
import { sqlite } from "@lucidcms/db-sqlite";
import { expect, test } from "vitest";
import { node } from "../runtime.js";

test("makes hosted email templates available without a filesystem artifact", async () => {
	const { config } = await resolveConfigDefinition({
		definition: {
			runtime: node(),
			db: sqlite,
			config: () => ({
				secrets: "a".repeat(64),
				email: { templates: { manual: "Manual template" } },
			}),
		},
		env: {},
		meta: {
			host: "astro",
			emailTemplates: {
				"nested/welcome": {
					html: "Hello {{name}}",
					lastModified: "2026-09-05T00:00:00.000Z",
				},
			},
		},
	});

	expect(config.email.templates).toEqual({
		manual: "Manual template",
		"nested/welcome": "Hello {{name}}",
	});
	expect(
		config.http.extensions.some(
			({ name }) => name === "runtime-node:static-assets",
		),
	).toBe(false);
});
