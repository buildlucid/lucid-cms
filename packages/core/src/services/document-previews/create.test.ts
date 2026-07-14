import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getCollection: vi.fn(),
	getDocument: vi.fn(),
	deleteMultiple: vi.fn(),
	createSingle: vi.fn(),
}));

vi.mock("../collections/get-single-instance.js", () => ({
	default: mocks.getCollection,
}));
vi.mock("../documents/client/get-single.js", () => ({
	default: mocks.getDocument,
}));
vi.mock("../../libs/repositories/index.js", () => ({
	DocumentPreviewsRepository: class {
		deleteMultiple = mocks.deleteMultiple;
		createSingle = mocks.createSingle;
	},
}));

import create from "./create.js";

const buildContext = () =>
	({
		db: { client: {} },
		config: {
			db: {},
			localization: { defaultLocale: "en" },
		},
		env: { PREVIEW_ORIGIN: "https://site.example" },
		request: { tenantKey: "acme" },
	}) as never;

describe("document preview creation", () => {
	afterEach(() => vi.clearAllMocks());

	it("stores only a scoped token digest and returns an expiring URL", async () => {
		const resolver = vi.fn(
			() => new URL("/about?campaign=one#content", "https://site.example"),
		);
		mocks.getCollection.mockReturnValue({
			error: undefined,
			data: { config: { preview: { url: resolver, expiresIn: 60 } } },
		});
		mocks.getDocument.mockResolvedValue({
			error: undefined,
			data: { id: 8, collectionKey: "page", status: "latest", fields: {} },
		});
		mocks.deleteMultiple.mockResolvedValue({ error: undefined, data: [] });
		mocks.createSingle.mockResolvedValue({ error: undefined, data: { id: 1 } });

		const before = Date.now();
		const response = await create(buildContext(), {
			collectionKey: "page",
			documentId: 8,
			versionType: "latest",
			locale: "cy",
			userId: 3,
		});

		expect(response.error).toBeUndefined();
		const url = new URL(response.data?.url as string);
		const rawToken = url.searchParams.get("preview");
		expect(rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(url.searchParams.get("campaign")).toBe("one");
		expect(url.hash).toBe("#content");
		expect(
			Date.parse(response.data?.expiresAt as string),
		).toBeGreaterThanOrEqual(before + 59_000);
		expect(resolver).toHaveBeenCalledWith(
			expect.objectContaining({
				env: { PREVIEW_ORIGIN: "https://site.example" },
				locale: "cy",
				tenantKey: "acme",
			}),
		);
		const storedData = mocks.createSingle.mock.calls[0]?.[0]?.data;
		expect(storedData.token_hash).toMatch(/^[a-f0-9]{64}$/);
		expect(storedData.token_hash).not.toBe(rawToken);
		expect(storedData).toMatchObject({
			collection_key: "page",
			document_id: 8,
			version_type: "latest",
			version_id: null,
			tenant_key: "acme",
			created_by: 3,
		});
	});

	it("does not create a token when the resolver returns null", async () => {
		mocks.getCollection.mockReturnValue({
			error: undefined,
			data: { config: { preview: { url: () => null } } },
		});
		mocks.getDocument.mockResolvedValue({
			error: undefined,
			data: { id: 8, collectionKey: "page", status: "latest", fields: {} },
		});

		const response = await create(buildContext(), {
			collectionKey: "page",
			documentId: 8,
			versionType: "latest",
			userId: 3,
		});

		expect(response).toEqual({
			error: undefined,
			data: { url: null, expiresAt: null },
		});
		expect(mocks.createSingle).not.toHaveBeenCalled();
	});

	it("pins revision previews to their exact version", async () => {
		mocks.getCollection.mockReturnValue({
			error: undefined,
			data: {
				config: {
					preview: { url: () => new URL("/about", "https://site.example") },
				},
			},
		});
		mocks.getDocument.mockResolvedValue({
			error: undefined,
			data: { id: 8, collectionKey: "page", status: "revision", fields: {} },
		});
		mocks.deleteMultiple.mockResolvedValue({ error: undefined, data: [] });
		mocks.createSingle.mockResolvedValue({ error: undefined, data: { id: 1 } });

		await create(buildContext(), {
			collectionKey: "page",
			documentId: 8,
			versionType: "revision",
			versionId: 91,
			userId: 3,
		});

		expect(mocks.getDocument).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ status: "revision", versionId: 91 }),
		);
		expect(mocks.createSingle.mock.calls[0]?.[0]?.data).toMatchObject({
			version_type: "revision",
			version_id: 91,
		});
	});
});
