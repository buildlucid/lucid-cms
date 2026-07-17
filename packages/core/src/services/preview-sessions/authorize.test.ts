import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	selectPreview: vi.fn(),
	selectPublishOperation: vi.fn(),
}));

vi.mock("../../libs/repositories/index.js", () => ({
	PreviewSessionsRepository: class {
		selectSingle = mocks.selectPreview;
	},
	DocumentPublishOperationsRepository: class {
		selectSingle = mocks.selectPublishOperation;
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
	mode: "scoped",
	entry_version_id: 73,
	expires_at: "2099-01-01T00:00:00.000Z",
	...overrides,
});

const buildContext = (tenantKey: string | null = "acme") =>
	({
		db: { client: {} },
		config: {
			db: {
				getDefault: (_type: string, value: string) => value === "true",
			},
			collections: [
				{
					key: "page",
					getData: {
						environments: [
							{
								key: "staging",
								collectionVersions: { article: "review" },
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
		mocks.selectPublishOperation.mockResolvedValue({
			error: undefined,
			data: { target: "staging" },
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
				mode: "scoped",
				entry: {
					collectionKey: "page",
					documentId: 42,
					version: "revision",
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
				mode: "perspective",
				entry_version_id: null,
			}),
		});

		const response = await authorize(buildContext(), {
			token,
			collectionKey,
			versionType: "production",
		});

		expect(response.data).toMatchObject({
			mode: "perspective",
			versionType: expectedVersionType,
		});
	});

	it.each([
		["revision", 73, "production"],
		["snapshot", 91, "review"],
		["latest", null, "latest"],
		["staging", null, "review"],
	] as const)("locks a scoped %s preview to its entry document while resolving auxiliary collections to %s", async (entryVersionType, entryVersionId, auxiliaryVersionType) => {
		mocks.selectPreview.mockResolvedValue({
			error: undefined,
			data: buildPreview({
				entry_version_type: entryVersionType,
				mode: "scoped",
				entry_version_id: entryVersionId,
			}),
		});

		const entry = await authorize(buildContext(), {
			token,
			collectionKey: "page",
			versionType: "production",
		});
		const related = await authorize(buildContext(), {
			token,
			collectionKey: "article",
			versionType: "production",
		});

		expect(entry.data).toMatchObject({
			mode: "scoped",
			target: "entry",
			entry: {
				collectionKey: "page",
				documentId: 42,
				versionType: entryVersionType,
				versionId: entryVersionId ?? undefined,
			},
		});
		expect(related).toEqual({
			error: undefined,
			data: {
				mode: "scoped",
				target: "auxiliary",
				entry: {
					collectionKey: "page",
					documentId: 42,
				},
				versionType: auxiliaryVersionType,
			},
		});
	});

	it("uses the pinned snapshot's release target when resolving scoped auxiliary collections", async () => {
		mocks.selectPreview.mockResolvedValue({
			error: undefined,
			data: buildPreview({
				entry_version_type: "snapshot",
				entry_version_id: 91,
			}),
		});

		await authorize(buildContext(), {
			token,
			collectionKey: "article",
			versionType: "production",
		});

		expect(mocks.selectPublishOperation).toHaveBeenCalledWith({
			select: ["target"],
			where: [
				{ key: "collection_key", operator: "=", value: "page" },
				{ key: "document_id", operator: "=", value: 42 },
				{ key: "snapshot_version_id", operator: "=", value: 91 },
			],
		});
	});

	it.each([
		["scoped", "latest", 73],
		["scoped", "revision", null],
		["perspective", "latest", 73],
		["perspective", "revision", 73],
		["perspective", "revision", null],
		["perspective", "snapshot", null],
	] as const)("rejects an invalid persisted %s %s session with version ID %s", async (mode, entryVersionType, entryVersionId) => {
		mocks.selectPreview.mockResolvedValue({
			error: undefined,
			data: buildPreview({
				mode,
				entry_version_type: entryVersionType,
				entry_version_id: entryVersionId,
			}),
		});

		const response = await resolve(buildContext(), { token });

		expect(response.error).toMatchObject({
			status: 401,
			code: "preview_invalid",
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
				mode: "perspective",
				entry_version_id: null,
			}),
		});

		const response = await authorize(buildContext(tenantKey), {
			token,
			collectionKey: "secret",
			versionType: "production",
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

	it("keeps the requested version when a preview has no target collection mapping", async () => {
		mocks.selectPreview.mockResolvedValue({
			error: undefined,
			data: buildPreview({
				entry_version_type: "staging",
				mode: "perspective",
				entry_version_id: null,
			}),
		});

		const response = await authorize(buildContext(), {
			token,
			collectionKey: "secret",
			versionType: "revision",
			versionId: 55,
		});

		expect(response).toEqual({
			error: undefined,
			data: {
				mode: "perspective",
				entry: {
					collectionKey: "page",
					documentId: 42,
				},
				versionType: "revision",
				versionId: 55,
			},
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
