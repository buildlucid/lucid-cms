import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requests = vi.hoisted(() => ({
	complete: vi.fn(),
	getSession: vi.fn(),
}));

vi.mock("@/services/api/media/uploadSessionRequests", () => ({
	completeUploadSessionReq: requests.complete,
	getUploadPartUrlsReq: vi.fn(),
	getUploadSessionReq: requests.getSession,
}));

import { uploadMediaFile } from "./upload-session";

class MockXMLHttpRequest {
	static instances: MockXMLHttpRequest[] = [];

	method = "";
	url = "";
	body: XMLHttpRequestBodyInit | null = null;
	status = 204;
	statusText = "No Content";
	responseText = "";
	headers = new Map<string, string>();
	upload = {
		onprogress: null as ((event: ProgressEvent) => void) | null,
	};
	onload: (() => void) | null = null;
	onerror: (() => void) | null = null;
	onabort: (() => void) | null = null;

	constructor() {
		MockXMLHttpRequest.instances.push(this);
	}

	open(method: string, url: string) {
		this.method = method;
		this.url = url;
	}

	setRequestHeader(key: string, value: string) {
		this.headers.set(key, value);
	}

	getAllResponseHeaders() {
		return "Upload-Offset: 3\r\n";
	}

	send(body: XMLHttpRequestBodyInit | null) {
		this.body = body;
		this.upload.onprogress?.({
			lengthComputable: true,
			loaded: body instanceof Blob ? body.size : 0,
		} as ProgressEvent);
		this.onload?.();
	}

	abort() {
		this.onabort?.();
	}
}

describe("media upload sessions", () => {
	beforeEach(() => {
		localStorage.clear();
		MockXMLHttpRequest.instances = [];
		requests.complete.mockReset().mockResolvedValue({
			data: { key: "public/video.mp4" },
		});
		requests.getSession.mockReset();
		vi.stubGlobal(
			"XMLHttpRequest",
			MockXMLHttpRequest as unknown as typeof XMLHttpRequest,
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("creates a TUS resource before uploading and completing the Lucid session", async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				new Response(null, {
					status: 201,
					headers: { Location: "/tus/resources/1" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(null, {
					status: 200,
					headers: { "Upload-Offset": "0" },
				}),
			);
		vi.stubGlobal("fetch", fetchMock);
		const file = new File(["abc"], "café.mp4", {
			type: "video/mp4",
			lastModified: 1,
		});

		const result = await uploadMediaFile({
			file,
			scope: "media",
			start: async () => ({
				data: {
					protocol: "tus",
					key: "public/video.mp4",
					sessionId: "session-1",
					endpoint: "https://video.example.com/tusupload",
					headers: { Authorization: "Bearer token" },
					metadata: { filetype: "video/mp4", title: file.name },
					expiresAt: "2099-01-01T00:00:00.000Z",
				},
				meta: {
					links: [],
					path: "",
					currentPage: null,
					lastPage: null,
					perPage: null,
					total: null,
				},
			}),
		});

		expect(result).toEqual({
			error: undefined,
			data: "public/video.mp4",
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[0]?.[0]).toBe(
			"https://video.example.com/tusupload",
		);
		const creationHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
		expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
		expect(creationHeaders.get("Tus-Resumable")).toBe("1.0.0");
		expect(creationHeaders.get("Upload-Length")).toBe("3");
		expect(creationHeaders.get("Upload-Metadata")).toBe(
			"filetype dmlkZW8vbXA0,title Y2Fmw6kubXA0",
		);
		expect(fetchMock.mock.calls[1]?.[0]).toBe(
			"https://video.example.com/tus/resources/1",
		);

		const patch = MockXMLHttpRequest.instances[0];
		expect(patch?.method).toBe("PATCH");
		expect(patch?.url).toBe("https://video.example.com/tus/resources/1");
		expect(patch?.headers.get("Upload-Offset")).toBe("0");
		expect(patch?.headers.get("Content-Type")).toBe(
			"application/offset+octet-stream",
		);
		expect(patch?.body).toBeInstanceOf(Blob);
		expect(requests.complete).toHaveBeenCalledWith({
			sessionId: "session-1",
		});
		expect(localStorage.length).toBe(0);
	});

	it("resumes the stored TUS resource without creating another one", async () => {
		const file = new File(["abc"], "video.mp4", {
			type: "video/mp4",
			lastModified: 1,
		});
		localStorage.setItem(
			"lucid-upload-session:media:video.mp4:3:1",
			JSON.stringify({
				sessionId: "session-1",
				key: "public/video.mp4",
				expiresAt: "2099-01-01T00:00:00.000Z",
				tusUploadUrl: "https://video.example.com/tus/resources/1",
			}),
		);
		requests.getSession.mockResolvedValue({
			data: {
				canResume: true,
				protocol: "tus",
				key: "public/video.mp4",
				sessionId: "session-1",
				endpoint: "https://video.example.com/tusupload",
				headers: { Authorization: "Bearer token" },
				expiresAt: "2099-01-01T00:00:00.000Z",
			},
		});
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(null, {
				status: 200,
				headers: { "Upload-Offset": "3" },
			}),
		);
		vi.stubGlobal("fetch", fetchMock);
		const start = vi.fn();

		const result = await uploadMediaFile({ file, scope: "media", start });

		expect(result.error).toBeUndefined();
		expect(start).not.toHaveBeenCalled();
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0]?.[0]).toBe(
			"https://video.example.com/tus/resources/1",
		);
		expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("HEAD");
		expect(MockXMLHttpRequest.instances).toHaveLength(0);
		expect(requests.complete).toHaveBeenCalledWith({
			sessionId: "session-1",
		});
	});
});
