import { describe, expect, it } from "vitest";
import { createPageMarkup } from "./page-markup.js";

const preview = {
	kind: "preview",
	mode: "perspective",
	token: "a".repeat(43),
	expiresAt: "2099-01-01T00:00:00.000Z",
} as const;

describe("createPageMarkup", () => {
	it("adds the referrer policy, toolbar and script during a preview", () => {
		const markup = createPageMarkup({
			scriptSrc: "/client.js",
			authentication: false,
			document: { collectionKey: "page", id: 2, version: "latest" },
			preview,
		});

		expect(markup.head).toBe('<meta name="referrer" content="no-referrer">');
		expect(markup.footer).toContain(
			'<lucid-toolbar auth-status="unauthenticated"',
		);
		expect(markup.footer).toContain('preview="perspective"');
		expect(markup.footer).toContain(
			'<script type="module" src="/client.js"></script>',
		);
	});

	it("is empty when there is nothing to show", () => {
		expect(
			createPageMarkup({
				scriptSrc: "/client.js",
				authentication: false,
				// @ts-expect-error
				preview: { kind: "published", source: null },
			}),
		).toEqual({ head: "", footer: "" });
	});
});
