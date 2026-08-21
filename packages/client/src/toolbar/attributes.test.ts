import { describe, expect, it } from "vitest";
import { createToolbarAttributes } from "./attributes.js";
import { toolbarFromToolkit } from "./toolkit.js";

const activePreview = {
	kind: "preview",
	mode: "perspective",
	token: "a".repeat(43),
	expiresAt: "2099-01-01T00:00:00.000Z",
} as const;

describe("createToolbarAttributes", () => {
	it("keeps automatic browser resolution as the zero-config default", () => {
		expect(createToolbarAttributes()).toEqual({
			"auth-status": "auto",
			preview: "auto",
		});
	});

	it("does not render settled published state without an action", () => {
		expect(
			createToolbarAttributes({ preview: { kind: "published" } }),
		).toBeNull();
	});

	it("serializes canonical document and preview state", () => {
		expect(
			createToolbarAttributes({
				host: new URL("https://cms.example.com"),
				authentication: true,
				document: {
					collectionKey: "page",
					id: 42,
					version: "revision",
					meta: { versionId: 7 },
				},
				editLabel: "Edit article",
				preview: activePreview,
				previewNavigation: { exitUrl: "/published" },
			}),
		).toEqual({
			"auth-status": "authenticated",
			host: "https://cms.example.com/",
			"edit-collection": "page",
			"edit-document-id": 42,
			"edit-version": "revision",
			"edit-version-id": 7,
			"edit-label": "Edit article",
			preview: "perspective",
			"preview-token": activePreview.token,
			"preview-expires-at": activePreview.expiresAt,
			"preview-exit-href": "/published",
		});
	});
});

describe("toolbarFromToolkit", () => {
	it("adapts response bags without leaking them into the generic API", () => {
		expect(
			toolbarFromToolkit({
				authentication: { data: { authenticated: false } },
				document: {},
				preview: { data: activePreview },
			}),
		).toMatchObject({
			"auth-status": "unauthenticated",
			preview: "perspective",
			"preview-token": activePreview.token,
		});
	});

	it("falls back to browser resolution for unavailable responses", () => {
		expect(
			toolbarFromToolkit({
				authentication: {},
				document: {},
				preview: {},
			}),
		).toEqual({
			"auth-status": "auto",
			preview: "auto",
		});
	});
});
