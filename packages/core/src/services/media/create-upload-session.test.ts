import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getMediaAdapter: vi.fn(),
	createAwaitingSync: vi.fn(),
	createUploadRecord: vi.fn(),
}));

vi.mock("../../libs/media/get-adapter.js", () => ({
	default: mocks.getMediaAdapter,
}));

vi.mock("../../libs/repositories/index.js", () => ({
	MediaAwaitingSyncRepository: class {
		createSingle = mocks.createAwaitingSync;
	},
	MediaUploadSessionsRepository: class {
		createSingle = mocks.createUploadRecord;
	},
}));

import createUploadSession from "./create-upload-session.js";

describe("create upload session", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("rejects files over the configured size limit before creating adapter sessions", async () => {
		const adapterCreateUploadSession = vi.fn();
		mocks.getMediaAdapter.mockResolvedValueOnce({
			enabled: true,
			adapter: {
				createUploadSession: adapterCreateUploadSession,
			},
		});

		const response = await createUploadSession(
			{
				config: {
					media: {
						limits: {
							fileSize: 10,
						},
					},
				},
			} as never,
			{
				fileName: "too-large.png",
				mimeType: "image/png",
				size: 11,
				public: true,
				userId: 1,
			},
		);

		expect(response.error?.status).toBe(500);
		expect(adapterCreateUploadSession).not.toHaveBeenCalled();
	});

	it("returns single upload session data for single upload adapters", async () => {
		mocks.getMediaAdapter.mockResolvedValueOnce({
			enabled: true,
			adapter: {
				key: "file-system",
				createUploadSession: vi.fn().mockResolvedValueOnce({
					error: undefined,
					data: {
						mode: "single",
						key: "public/test.png",
						url: "https://example.com/upload",
					},
				}),
			},
		});
		mocks.createAwaitingSync.mockResolvedValueOnce({
			error: undefined,
			data: {
				key: "public/test.png",
			},
		});

		const response = await createUploadSession(
			{
				db: {
					client: {},
				},
				request: {
					url: "https://example.com/lucid/api/v1/media/upload-session",
				},
				config: {
					baseUrl: "https://example.com",
					db: {},
					secrets: {
						cookie: "secret",
					},
					media: {
						limits: {
							fileSize: 100,
						},
					},
				},
			} as never,
			{
				fileName: "test.png",
				mimeType: "image/png",
				size: 10,
				public: true,
				userId: 1,
			},
		);

		expect(response.error).toBeUndefined();
		expect(response.data).toMatchObject({
			mode: "single",
			key: "public/test.png",
			url: "https://example.com/upload",
		});
	});

	it("returns resumable upload session data for resumable upload adapters", async () => {
		mocks.getMediaAdapter.mockResolvedValueOnce({
			enabled: true,
			adapter: {
				key: "s3",
				createUploadSession: vi.fn().mockResolvedValueOnce({
					error: undefined,
					data: {
						mode: "resumable",
						key: "public/test.png",
						uploadId: "adapter-upload-id",
						partSize: 5,
						expiresAt: "2026-05-02T10:00:00.000Z",
						uploadedParts: [],
					},
				}),
				getUploadPartUrls: vi.fn(),
				listUploadParts: vi.fn(),
				completeUploadSession: vi.fn(),
			},
		});
		mocks.createUploadRecord.mockResolvedValueOnce({
			error: undefined,
			data: {
				session_id: "session-id",
			},
		});

		const response = await createUploadSession(
			{
				db: {
					client: {},
				},
				request: {
					url: "https://example.com/lucid/api/v1/media/upload-session",
				},
				config: {
					baseUrl: "https://example.com",
					db: {},
					secrets: {
						cookie: "secret",
					},
					media: {
						limits: {
							fileSize: 100,
						},
					},
				},
			} as never,
			{
				fileName: "test.png",
				mimeType: "image/png",
				size: 10,
				public: true,
				userId: 1,
			},
		);

		expect(response.error).toBeUndefined();
		expect(response.data).toMatchObject({
			mode: "resumable",
			key: "public/test.png",
			partSize: 5,
			expiresAt: "2026-05-02T10:00:00.000Z",
			uploadedParts: [],
		});
	});
});
