// @vitest-environment happy-dom

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { LucidToolbarElement } from "./declarative.js";

beforeAll(() => {
	if (!customElements.get(LucidToolbarElement.tagName)) {
		customElements.define(LucidToolbarElement.tagName, LucidToolbarElement);
	}
});

afterEach(() => {
	document.body.innerHTML = "";
	vi.restoreAllMocks();
});

describe("LucidToolbarElement", () => {
	it("updates its long-lived runtime when route attributes change", async () => {
		const toolbar = document.createElement(LucidToolbarElement.tagName);
		toolbar.setAttribute("auth-status", "authenticated");
		toolbar.setAttribute("edit-collection", "page");
		toolbar.setAttribute("edit-document-id", "1");
		toolbar.setAttribute("edit-version", "latest");
		toolbar.setAttribute("preview", "published");
		document.body.append(toolbar);

		await vi.waitFor(() => {
			expect(
				document
					.querySelector("lucid-preview-toolbar")
					?.shadowRoot?.querySelector<HTMLAnchorElement>(".edit")?.href,
			).toContain("/collections/page/latest/1");
		});
		const runtime = document.querySelector("lucid-preview-toolbar");

		toolbar.setAttribute("edit-document-id", "2");

		await vi.waitFor(() => {
			expect(
				document
					.querySelector("lucid-preview-toolbar")
					?.shadowRoot?.querySelector<HTMLAnchorElement>(".edit")?.href,
			).toContain("/collections/page/latest/2");
		});
		expect(document.querySelector("lucid-preview-toolbar")).toBe(runtime);
	});
});
