import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getMediaAdapter: vi.fn(),
}));

vi.mock("../../libs/media/get-adapter.js", () => ({
	default: mocks.getMediaAdapter,
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
});
