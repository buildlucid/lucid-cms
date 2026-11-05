// @vitest-environment happy-dom

import { readStoredPreview } from "@lucidcms/client/contract";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setupToolbar } from "./toolbar.js";

const token = "a".repeat(43);
const expiresAt = "2099-01-01T00:00:00.000Z";
const entry = {
	collectionKey: "page",
	documentId: 4,
	version: "latest",
	versionId: null,
} as const;

const respond = (status: number, data?: unknown) =>
	new Response(data === undefined ? null : JSON.stringify({ data }), {
		status,
		headers: { "Content-Type": "application/json" },
	});

const toolbarRoot = () =>
	document.querySelector("lucid-preview-toolbar")?.shadowRoot ?? null;

/** Waits for the toolbar's requests and renders to settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
	window.history.replaceState({}, "", "/");
	window.sessionStorage.clear();
	document.body.innerHTML = "";
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("setupToolbar", () => {
	it("keeps a navigable link's preview while browsing, then exits it", async () => {
		const fetch = vi
			.spyOn(window, "fetch")
			.mockImplementation(async (input) =>
				String(input).endsWith("/auth/status")
					? respond(401)
					: respond(200, { mode: "navigable", expiresAt, entry }),
			);
		const navigate = vi.fn();
		window.history.replaceState({}, "", `/about?preview=${token}`);

		const toolbar = setupToolbar({
			host: window.location.origin,
			document: null,
			visible: true,
			navigate,
		});
		await settle();

		expect(window.location.search).toBe("");
		expect(readStoredPreview(window, window.location.origin)?.token).toBe(
			token,
		);
		expect(toolbarRoot()?.querySelector(".status-label")?.textContent).toBe(
			"Navigable preview",
		);
		expect(fetch).toHaveBeenCalledWith(
			new URL("/api/v1/content/preview", window.location.origin),
			expect.objectContaining({ credentials: "omit" }),
		);

		await toolbar.exit();
		expect(navigate).toHaveBeenCalledWith(
			new URL(`/about?preview=exit`, window.location.origin),
		);
		expect(readStoredPreview(window, window.location.origin)).toBeNull();
		expect(toolbarRoot()).toBeNull();
		toolbar.cleanup();
	});

	it("links signed-in editors to the page's document, following later changes", async () => {
		vi.spyOn(window, "fetch").mockResolvedValue(respond(204));
		const toolbar = setupToolbar({
			host: "https://cms.example.com",
			document: { collectionKey: "page", id: 1, version: "latest" },
			visible: true,
		});
		await settle();
		toolbar.setDocument({ collectionKey: "page", id: 2, version: "latest" });
		await settle();

		const edit = toolbarRoot()?.querySelector<HTMLAnchorElement>(".edit");
		expect(edit?.href).toBe(
			"https://cms.example.com/admin/collections/page/latest/2",
		);
		expect(edit?.getAttribute("aria-label")).toBe("Edit page");
		toolbar.cleanup();
	});

	it("shows the published page for a link that has expired", async () => {
		vi.spyOn(window, "fetch").mockResolvedValue(respond(401));
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		window.history.replaceState({}, "", `/?preview=${token}`);

		const toolbar = setupToolbar({
			host: window.location.origin,
			document: null,
			visible: true,
		});
		await settle();

		expect(toolbarRoot()).toBeNull();
		expect(warn).toHaveBeenCalledOnce();
		toolbar.cleanup();
	});
});
