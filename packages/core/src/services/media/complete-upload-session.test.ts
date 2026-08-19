import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	selectUploadSession: vi.fn(),
	updateUploadSession: vi.fn(),
	deleteAwaitingSync: vi.fn(),
	createAwaitingSync: vi.fn(),
}));

vi.mock("../../libs/repositories/index.js", () => ({
	MediaUploadSessionsRepository: class {
		selectSingle = mocks.selectUploadSession;
		updateSingle = mocks.updateUploadSession;
	},
	MediaAwaitingSyncRepository: class {
		deleteSingle = mocks.deleteAwaitingSync;
		createSingle = mocks.createAwaitingSync;
	},
}));

import completeUploadSession from "./complete-upload-session.js";

describe("complete upload session", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("verifies HTTP uploads and moves them into the awaiting-sync flow", async () => {
		mocks.selectUploadSession.mockResolvedValueOnce({
			error: undefined,
			data: {
				session_id: "session-id",
				key: "public/example.png",
				adapter_key: "file-system",
				adapter_upload_id: null,
				protocol: "http",
				status: "active",
			},
		});
		mocks.deleteAwaitingSync.mockResolvedValueOnce({
			error: undefined,
			data: undefined,
		});
		mocks.createAwaitingSync.mockResolvedValueOnce({
			error: undefined,
			data: { key: "public/example.png" },
		});
		mocks.updateUploadSession.mockResolvedValueOnce({
			error: undefined,
			data: { session_id: "session-id" },
		});
		const getMeta = vi.fn().mockResolvedValueOnce({
			error: undefined,
			data: {
				size: 10,
				mimeType: "image/png",
				etag: "etag",
				status: "ready",
			},
		});

		const response = await completeUploadSession(
			{
				db: {},
				mediaStorage: {
					key: "file-system",
					getMeta,
				},
			} as never,
			{ sessionId: "session-id" },
		);

		expect(response).toMatchObject({
			error: undefined,
			data: { key: "public/example.png" },
		});
		expect(getMeta).toHaveBeenCalledWith(expect.anything(), {
			key: "public/example.png",
		});
		expect(mocks.createAwaitingSync).toHaveBeenCalled();
		expect(mocks.updateUploadSession).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: "completed" }),
			}),
		);
	});

	it("does not finalize sessions created by another storage adapter", async () => {
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
		const getMeta = vi.fn();

		const response = await completeUploadSession(
			{
				db: {},
				mediaStorage: { key: "current-storage", getMeta },
			} as never,
			{ sessionId: "session-id" },
		);

		expect(response.error?.status).toBe(400);
		expect(getMeta).not.toHaveBeenCalled();
		expect(mocks.updateUploadSession).not.toHaveBeenCalled();
	});
});
