import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	selectPreview: vi.fn(),
}));

vi.mock("../../libs/repositories/index.js", () => ({
	PreviewSessionsRepository: class {
		selectSingle = mocks.selectPreview;
	},
}));

import { hashPreviewToken } from "../../utils/helpers/index.js";
import authorize from "./authorize.js";
import resolve from "./resolve.js";

const token = "a".repeat(43);

const buildPreview = (overrides: Record<string, unknown> = {}) => ({
	id: 4,
	entry_collection_key: "page",
	entry_document_id: 42,
	entry_version_type: "revision",
	entry_version_id: 73,
	expires_at: "2099-01-01T00:00:00.000Z",
	...overrides,
});

const buildContext = (tenantKey: string | null = "acme") =>
	({
		db: { client: {} },
		config: {
			db: {},
			collections: [
				{
					key: "page",
					getData: {
						environments: [
							{
								key: "staging",
								relations: { article: "review" },
							},
						],
					},
				},
				{
					key: "article",
					getData: { environments: [{ key: "review" }] },
				},
			],
		},
		request: { tenantKey },
	}) as never;

describe("preview session resolution and authorization", () => {
	beforeEach(() => {
		mocks.selectPreview.mockResolvedValue({
			error: undefined,
			data: buildPreview(),
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("resolves an opaque token by hash and exposes no persisted digest", async () => {
		const response = await resolve(buildContext(), { token });

		expect(response).toEqual({
			error: undefined,
			data: {
				mode: "exact",
				entry: {
					collectionKey: "page",
					documentId: 42,
					versionType: "revision",
					versionId: 73,
				},
				expiresAt: "2099-01-01T00:00:00.000Z",
			},
		});
		expect(mocks.selectPreview).toHaveBeenCalledWith(
			expect.objectContaining({
				where: [
					{
						key: "token_hash",
						operator: "=",
						value: hashPreviewToken(token),
					},
				],
			}),
		);
	});

	it.each([
		["latest", "page", "latest"],
		["latest", "article", "latest"],
		["staging", "page", "staging"],
		["staging", "article", "review"],
	] as const)("resolves the %s perspective for %s as %s", async (entryVersionType, collectionKey, expectedVersionType) => {
		mocks.selectPreview.mockResolvedValue({
			error: undefined,
			data: buildPreview({
				entry_version_type: entryVersionType,
				entry_version_id: null,
			}),
		});

		const response = await authorize(buildContext(), {
			token,
			collectionKey,
		});

		expect(response.data).toMatchObject({
			mode: "perspective",
			versionType: expectedVersionType,
		});
	});

	it.each([
		["revision", 73],
		["snapshot", 91],
	] as const)("locks an exact %s preview to its entry document and version ID", async (entryVersionType, entryVersionId) => {
		mocks.selectPreview.mockResolvedValue({
			error: undefined,
			data: buildPreview({
				entry_version_type: entryVersionType,
				entry_version_id: entryVersionId,
			}),
		});

		const entry = await authorize(buildContext(), {
			token,
			collectionKey: "page",
		});
		const related = await authorize(buildContext(), {
			token,
			collectionKey: "article",
		});

		expect(entry.data).toMatchObject({
			mode: "exact",
			entry: {
				collectionKey: "page",
				documentId: 42,
				versionType: entryVersionType,
				versionId: entryVersionId,
			},
		});
		expect(related.error).toMatchObject({
			status: 403,
			code: "preview_scope",
		});
	});

	it.each([
		null,
		"other",
	])("leaves collection and tenant authorization to request tenant %s", async (tenantKey) => {
		mocks.selectPreview.mockResolvedValue({
			error: undefined,
			data: buildPreview({
				entry_version_type: "latest",
				entry_version_id: null,
			}),
		});

		const response = await authorize(buildContext(tenantKey), {
			token,
			collectionKey: "secret",
		});

		expect(response.error).toBeUndefined();
		expect(response.data).toEqual({
			mode: "perspective",
			entry: {
				collectionKey: "page",
				documentId: 42,
			},
			versionType: "latest",
		});
	});

	it("returns a typed expiry error", async () => {
		mocks.selectPreview.mockResolvedValue({
			error: undefined,
			data: buildPreview({ expires_at: "2000-01-01T00:00:00.000Z" }),
		});

		const response = await resolve(buildContext(), { token });

		expect(response.error).toMatchObject({
			status: 401,
			code: "preview_expired",
		});
	});

	it.each([
		"bad-token",
		"b".repeat(43),
	])("returns a typed invalid error for %s", async (candidate) => {
		if (candidate.length === 43) {
			mocks.selectPreview.mockResolvedValue({
				error: undefined,
				data: undefined,
			});
		}

		const response = await resolve(buildContext(), { token: candidate });

		expect(response.error).toMatchObject({
			status: 401,
			code: "preview_invalid",
		});
		if (candidate === "bad-token") {
			expect(mocks.selectPreview).not.toHaveBeenCalled();
		}
	});
});
