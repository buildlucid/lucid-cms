import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	selectUploadSession: vi.fn(),
	deleteUploadSession: vi.fn(),
	deleteAwaitingSync: vi.fn(),
}));

vi.mock("../../libs/repositories/index.js", () => ({
	MediaUploadSessionsRepository: class {
		selectSingle = mocks.selectUploadSession;
		deleteSingle = mocks.deleteUploadSession;
	},
	MediaAwaitingSyncRepository: class {
		deleteSingle = mocks.deleteAwaitingSync;
	},
}));

import abortUploadSession from "./abort-upload-session.js";

describe("abort upload session", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("does not delete through a storage adapter that does not own the session", async () => {
		mocks.selectUploadSession.mockResolvedValueOnce({
			error: undefined,
			data: {
				session_id: "session-id",
				key: "public/example.png",
				adapter_key: "previous-storage",
				adapter_upload_id: null,
				protocol: "http",
				status: "active",
			},
		});
		const deleteFile = vi.fn();

		const response = await abortUploadSession(
			{
				db: {},
				mediaStorage: {
					key: "current-storage",
					delete: deleteFile,
				},
			} as never,
			{ sessionId: "session-id" },
		);

		expect(response.error?.status).toBe(400);
		expect(deleteFile).not.toHaveBeenCalled();
		expect(mocks.deleteUploadSession).not.toHaveBeenCalled();
	});

	it("passes the upload protocol to adapter cleanup", async () => {
		mocks.selectUploadSession.mockResolvedValueOnce({
			error: undefined,
			data: {
				session_id: "session-id",
				key: "public/video.mp4",
				adapter_key: "video-provider",
				adapter_upload_id: "provider-video-id",
				protocol: "tus",
				status: "active",
			},
		});
		mocks.deleteAwaitingSync.mockResolvedValueOnce({
			error: undefined,
			data: undefined,
		});
		mocks.deleteUploadSession.mockResolvedValueOnce({
			error: undefined,
			data: { session_id: "session-id" },
		});
		const abortAdapterSession = vi.fn().mockResolvedValueOnce({
			error: undefined,
			data: undefined,
		});
		const deleteFile = vi.fn().mockResolvedValueOnce({
			error: undefined,
			data: undefined,
		});

		const response = await abortUploadSession(
			{
				db: {},
				mediaStorage: {
					key: "video-provider",
					abortUploadSession: abortAdapterSession,
					delete: deleteFile,
				},
			} as never,
			{ sessionId: "session-id" },
		);

		expect(response.error).toBeUndefined();
		expect(abortAdapterSession).toHaveBeenCalledWith(expect.anything(), {
			protocol: "tus",
			key: "public/video.mp4",
			uploadId: "provider-video-id",
		});
		expect(deleteFile).toHaveBeenCalled();
	});
});
