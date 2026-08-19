import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	createUploadRecord: vi.fn(),
}));

vi.mock("../../libs/repositories/index.js", () => ({
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

		const response = await createUploadSession(
			{
				mediaStorage: {
					createUploadSession: adapterCreateUploadSession,
				},
				config: {
					media: {
						limits: {
							uploadBytes: 10,
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
		const adapterCreateUploadSession = vi.fn().mockResolvedValueOnce({
			error: undefined,
			data: {
				protocol: "http",
				key: "public/test.png",
				request: {
					url: "https://example.com/upload",
					method: "PUT",
					body: { type: "raw" },
				},
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
				db: {},
				mediaStorage: {
					key: "file-system",
					createUploadSession: adapterCreateUploadSession,
				},
				request: {
					url: "https://example.com/lucid/api/v1/media/upload-session",
				},
				config: {
					host: "https://example.com",
					db: {},
					secrets: {
						cookie: "secret",
					},
					media: {
						limits: {
							uploadBytes: 100,
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
			protocol: "http",
			key: "public/test.png",
			request: {
				url: "https://example.com/upload",
			},
		});
	});

	it("returns resumable upload session data for resumable upload adapters", async () => {
		const adapterCreateUploadSession = vi.fn().mockResolvedValueOnce({
			error: undefined,
			data: {
				protocol: "multipart-parts",
				key: "public/test.png",
				uploadId: "adapter-upload-id",
				partSize: 5,
				expiresAt: "2026-05-02T10:00:00.000Z",
				uploadedParts: [],
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
				db: {},
				mediaStorage: {
					key: "s3",
					createUploadSession: adapterCreateUploadSession,
					getUploadPartUrls: vi.fn(),
					listUploadParts: vi.fn(),
					completeUploadSession: vi.fn(),
				},
				request: {
					url: "https://example.com/lucid/api/v1/media/upload-session",
				},
				config: {
					host: "https://example.com",
					db: {},
					secrets: {
						cookie: "secret",
					},
					media: {
						limits: {
							uploadBytes: 100,
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
			protocol: "multipart-parts",
			key: "public/test.png",
			partSize: 5,
			expiresAt: "2026-05-02T10:00:00.000Z",
			uploadedParts: [],
		});
	});

	it("persists and returns TUS upload session data", async () => {
		const adapterCreateUploadSession = vi.fn().mockResolvedValueOnce({
			error: undefined,
			data: {
				protocol: "tus",
				key: "public/video.mp4",
				uploadId: "provider-video-id",
				endpoint: "https://video.example.com/tusupload",
				headers: { Authorization: "Bearer upload-token" },
				metadata: { filetype: "video/mp4" },
				expiresAt: "2026-05-02T10:00:00.000Z",
			},
		});
		mocks.createUploadRecord.mockResolvedValueOnce({
			error: undefined,
			data: { session_id: "session-id" },
		});

		const response = await createUploadSession(
			{
				db: {},
				mediaStorage: {
					key: "video-provider",
					createUploadSession: adapterCreateUploadSession,
				},
				request: {
					url: "https://example.com/lucid/api/v1/media/upload-session",
				},
				config: {
					host: "https://example.com",
					db: {},
					secrets: { cookie: "secret" },
					media: { limits: { uploadBytes: 100 } },
				},
			} as never,
			{
				fileName: "video.mp4",
				mimeType: "video/mp4",
				size: 10,
				public: true,
				userId: 1,
			},
		);

		expect(response.error).toBeUndefined();
		expect(response.data).toMatchObject({
			protocol: "tus",
			key: "public/video.mp4",
			endpoint: "https://video.example.com/tusupload",
			headers: { Authorization: "Bearer upload-token" },
		});
		expect(adapterCreateUploadSession).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				fileName: "video.mp4",
				mimeType: "video/mp4",
				size: 10,
			}),
		);
		expect(mocks.createUploadRecord).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					adapter_upload_id: "provider-video-id",
					protocol: "tus",
					client_data: {
						endpoint: "https://video.example.com/tusupload",
						headers: { Authorization: "Bearer upload-token" },
						metadata: { filetype: "video/mp4" },
					},
				}),
			}),
		);
	});
});
