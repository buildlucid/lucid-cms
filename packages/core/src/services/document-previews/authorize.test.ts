import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	selectSingle: vi.fn(),
}));

vi.mock("../../libs/repositories/index.js", () => ({
	DocumentPreviewsRepository: class {
		selectSingle = mocks.selectSingle;
	},
}));

import hashPreviewToken from "../../utils/helpers/hash-preview-token.js";
import authorize from "./authorize.js";

const token = "a".repeat(43);
const buildContext = (tenantKey: string | null = null) =>
	({
		db: { client: {} },
		config: { db: {} },
		request: { tenantKey },
	}) as never;

describe("document preview authorization", () => {
	afterEach(() => vi.clearAllMocks());

	it("authorizes the exact document, collection and tenant", async () => {
		mocks.selectSingle.mockResolvedValueOnce({
			error: undefined,
			data: {
				collection_key: "page",
				document_id: 42,
				version_type: "snapshot",
				version_id: 73,
				tenant_key: "acme",
				expires_at: "2099-01-01T00:00:00.000Z",
			},
		});

		const response = await authorize(buildContext("acme"), {
			token,
			collectionKey: "page",
			versionType: "snapshot",
			versionId: 73,
		});

		expect(response).toEqual({
			error: undefined,
			data: { documentId: 42 },
		});
		expect(mocks.selectSingle).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.arrayContaining([
					expect.objectContaining({
						key: "token_hash",
						value: hashPreviewToken(token),
					}),
					expect.objectContaining({ key: "expires_at", operator: ">" }),
				]),
			}),
		);
	});

	it.each([
		[null, "acme"],
		["acme", null],
	])("uses standard global and tenant visibility for preview tokens", async (requestTenantKey, previewTenantKey) => {
		mocks.selectSingle.mockResolvedValueOnce({
			error: undefined,
			data: {
				collection_key: "page",
				document_id: 42,
				version_type: "latest",
				version_id: null,
				tenant_key: previewTenantKey,
				expires_at: "2099-01-01T00:00:00.000Z",
			},
		});

		const response = await authorize(buildContext(requestTenantKey), {
			token,
			collectionKey: "page",
			versionType: "latest",
		});

		expect(response).toEqual({
			error: undefined,
			data: { documentId: 42 },
		});
	});

	it.each([
		[undefined, "page", null],
		[
			{
				collection_key: "article",
				document_id: 42,
				version_type: "latest",
				version_id: null,
				tenant_key: null,
				expires_at: "2099-01-01T00:00:00.000Z",
			},
			"page",
			null,
		],
		[
			{
				collection_key: "page",
				document_id: 42,
				version_type: "latest",
				version_id: null,
				tenant_key: "other",
				expires_at: "2099-01-01T00:00:00.000Z",
			},
			"page",
			"acme",
		],
	])("rejects missing or out-of-scope tokens", async (data, collectionKey, tenantKey) => {
		mocks.selectSingle.mockResolvedValueOnce({ error: undefined, data });

		const response = await authorize(buildContext(tenantKey), {
			token,
			collectionKey,
			versionType: "latest",
		});

		expect(response.error?.status).toBe(401);
	});

	it("rejects malformed tokens before querying", async () => {
		const response = await authorize(buildContext(), {
			token: "not-a-token",
			collectionKey: "page",
			versionType: "latest",
		});

		expect(response.error?.status).toBe(401);
		expect(mocks.selectSingle).not.toHaveBeenCalled();
	});

	it("rejects a valid token used for another version target", async () => {
		mocks.selectSingle.mockResolvedValueOnce({
			error: undefined,
			data: {
				collection_key: "page",
				document_id: 42,
				version_type: "revision",
				version_id: 12,
				tenant_key: null,
				expires_at: "2099-01-01T00:00:00.000Z",
			},
		});

		const response = await authorize(buildContext(), {
			token,
			collectionKey: "page",
			versionType: "revision",
			versionId: 13,
		});

		expect(response.error?.status).toBe(401);
	});
});
