// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { previewStorageKey } from "./constants.js";
import { setupToolbar } from "./loader.js";

const firstToken = "a".repeat(43);
const expiresAt = "2099-01-01T00:00:00.000Z";

beforeEach(() => {
	window.history.replaceState({}, "", "/");
	window.sessionStorage.clear();
	document.body.innerHTML = "";
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("setupToolbar", () => {
	it("resolves and persists preview state without an integration token", async () => {
		const fetch = vi.spyOn(window, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({
					data: { mode: "perspective", expiresAt },
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
		window.history.replaceState({}, "", `/?preview=${firstToken}`);

		const toolbar = setupToolbar();
		await toolbar.ready;

		expect(toolbar.preview).toEqual({
			kind: "preview",
			mode: "perspective",
			token: firstToken,
			expiresAt,
		});
		expect(toolbar.active).toBe(true);
		expect(window.location.search).toBe("");
		expect(fetch).toHaveBeenCalledOnce();
		expect(fetch).toHaveBeenCalledWith(
			new URL("/lucid/api/v1/content/preview", window.location.origin),
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ token: firstToken }),
				credentials: "omit",
				referrerPolicy: "no-referrer",
			}),
		);

		await toolbar.update({
			document: null,
			url: `/another-page?preview=${firstToken}`,
		});
		expect(toolbar.preview.kind).toBe("preview");
		expect(fetch).toHaveBeenCalledOnce();
		toolbar.cleanup();
	});

	it("lets the latest SPA update win while earlier work is pending", async () => {
		let settleInitialAuthentication: (authenticated: boolean) => void = () =>
			undefined;
		const initialAuthentication = new Promise<boolean>((resolve) => {
			settleInitialAuthentication = resolve;
		});
		const authentication = vi
			.fn()
			.mockReturnValueOnce(initialAuthentication)
			.mockResolvedValueOnce(true);
		const toolbar = setupToolbar({
			authentication,
			document: { collectionKey: "page", id: 1, version: "latest" },
			preview: { kind: "published" },
		});

		await toolbar.update({
			document: { collectionKey: "page", id: 2, version: "latest" },
		});
		settleInitialAuthentication(true);
		await toolbar.ready;

		const element = document.querySelector("lucid-preview-toolbar");
		const edit = element?.shadowRoot?.querySelector<HTMLAnchorElement>(".edit");
		expect(edit?.href).toContain("/collections/page/latest/2");
		expect(document.querySelectorAll("lucid-preview-toolbar")).toHaveLength(1);
		toolbar.cleanup();
	});

	it("reports synchronous application authentication failures", async () => {
		const error = new Error("Authentication unavailable");
		const onError = vi.fn();
		const toolbar = setupToolbar({
			authentication: () => {
				throw error;
			},
			document: { collectionKey: "page", id: 1, version: "latest" },
			preview: { kind: "published" },
			onError,
		});

		await toolbar.ready;

		expect(onError).toHaveBeenCalledWith({
			kind: "authentication",
			cause: error,
		});
		expect(toolbar.active).toBe(false);
		toolbar.cleanup();
	});

	it("discards stored preview state with an invalid expiry", async () => {
		const storageKey = `${previewStorageKey}:${encodeURIComponent(window.location.origin)}`;
		window.sessionStorage.setItem(
			storageKey,
			JSON.stringify({
				kind: "preview",
				mode: "perspective",
				token: firstToken,
				expiresAt: "invalid",
			}),
		);
		const fetch = vi.spyOn(window, "fetch");

		const toolbar = setupToolbar();
		await toolbar.ready;

		expect(toolbar.preview).toEqual({ kind: "published" });
		expect(window.sessionStorage.getItem(storageKey)).toBeNull();
		expect(fetch).not.toHaveBeenCalled();
		toolbar.cleanup();
	});

	it("does not let pending route work restore an exited preview", async () => {
		let resolvePreviewRequest: (response: Response) => void = () => undefined;
		const previewRequest = new Promise<Response>((resolve) => {
			resolvePreviewRequest = resolve;
		});
		vi.spyOn(window, "fetch").mockReturnValue(previewRequest);
		const navigate = vi.fn().mockResolvedValue(undefined);
		const toolbar = setupToolbar({
			preview: {
				kind: "preview",
				mode: "perspective",
				token: firstToken,
				expiresAt,
			},
			previewNavigation: { navigate },
		});
		await toolbar.ready;

		const pendingUpdate = toolbar.update({
			document: null,
			preview: "auto",
			url: `/?preview=${"b".repeat(43)}`,
		});
		await toolbar.exitPreview();
		resolvePreviewRequest(
			new Response(
				JSON.stringify({ data: { mode: "perspective", expiresAt } }),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
		);
		await pendingUpdate;

		expect(toolbar.preview).toEqual({ kind: "published" });
		await toolbar.update({ document: null, preview: "auto", url: "/" });
		expect(toolbar.preview).toEqual({ kind: "published" });
		expect(toolbar.active).toBe(false);
		expect(navigate).toHaveBeenCalledOnce();
		toolbar.cleanup();
	});
});
