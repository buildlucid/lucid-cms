import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	lookup: vi.fn(),
	httpsRequest: vi.fn(),
}));

vi.mock("node:dns/promises", () => ({
	lookup: mocks.lookup,
}));

vi.mock("node:https", () => ({
	default: {
		request: mocks.httpsRequest,
	},
}));

import {
	isPublicIpAddress,
	resolveNodemailerAttachments,
} from "./remote-attachments.js";

const mockHttpsResponse = ({
	chunks = [Buffer.from("invoice")],
	headers = {},
	statusCode = 200,
	useAllLookup = false,
	useTwoArgumentLookup = false,
}: {
	chunks?: Buffer[];
	headers?: Record<string, string>;
	statusCode?: number;
	useAllLookup?: boolean;
	useTwoArgumentLookup?: boolean;
}) => {
	mocks.httpsRequest.mockImplementation((_url, options, callback) => {
		const request = new EventEmitter() as EventEmitter & {
			destroy: ReturnType<typeof vi.fn>;
			end: ReturnType<typeof vi.fn>;
		};
		request.destroy = vi.fn();
		request.end = vi.fn(() => {
			const emitResponse = () => {
				const response = new EventEmitter() as EventEmitter & {
					destroy: ReturnType<typeof vi.fn>;
					headers: Record<string, string>;
					resume: ReturnType<typeof vi.fn>;
					statusCode: number;
				};
				response.destroy = vi.fn();
				response.headers = headers;
				response.resume = vi.fn();
				response.statusCode = statusCode;

				callback(response);

				for (const chunk of chunks) {
					response.emit("data", chunk);
				}

				response.emit("end");
			};

			if (useTwoArgumentLookup) {
				options.lookup("assets.example.com", () => emitResponse());
				return;
			}

			if (useAllLookup) {
				options.lookup(
					"assets.example.com",
					{ all: true },
					(
						_error: unknown,
						addresses: { address: string; family: number }[],
					) => {
						if (addresses[0]?.address === "93.184.216.34") emitResponse();
					},
				);
				return;
			}

			emitResponse();
		});

		return request;
	});
};

describe("remote attachments", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test("classifies private and public addresses", () => {
		expect(isPublicIpAddress("127.0.0.1")).toBe(false);
		expect(isPublicIpAddress("10.0.0.1")).toBe(false);
		expect(isPublicIpAddress("169.254.169.254")).toBe(false);
		expect(isPublicIpAddress("::1")).toBe(false);
		expect(isPublicIpAddress("fc00::1")).toBe(false);
		expect(isPublicIpAddress("::ffff:127.0.0.1")).toBe(false);
		expect(isPublicIpAddress("not-an-ip")).toBe(false);
		expect(isPublicIpAddress("8.8.8.8")).toBe(true);
		expect(isPublicIpAddress("::ffff:8.8.8.8")).toBe(true);
		expect(isPublicIpAddress("2001:4860:4860::8888")).toBe(true);
	});

	test("rejects attachment URLs that resolve to blocked addresses", async () => {
		mocks.lookup.mockResolvedValueOnce([
			{
				address: "127.0.0.1",
				family: 4,
			},
		]);

		const result = await resolveNodemailerAttachments([
			{
				type: "url",
				url: "https://example.com/file.pdf",
				filename: "file.pdf",
			},
		]);

		expect(result.error?.message).toBe(
			"Attachment URL resolves to a blocked address.",
		);
		expect(result.data).toBeUndefined();
	});

	test("fetches attachment content by default", async () => {
		mocks.lookup.mockResolvedValueOnce([
			{
				address: "93.184.216.34",
				family: 4,
			},
		]);
		mockHttpsResponse({
			chunks: [Buffer.from("invoice")],
		});

		const result = await resolveNodemailerAttachments([
			{
				type: "url",
				url: "https://assets.example.com/invoice.pdf",
				filename: "invoice.pdf",
			},
		]);

		expect(result.error).toBeUndefined();
		expect(result.data?.[0]?.content?.toString()).toBe("invoice");
	});

	test("supports Node's two argument lookup callback when pinning DNS", async () => {
		mocks.lookup.mockResolvedValueOnce([
			{
				address: "93.184.216.34",
				family: 4,
			},
		]);
		mockHttpsResponse({
			chunks: [Buffer.from("invoice")],
			useTwoArgumentLookup: true,
		});

		const result = await resolveNodemailerAttachments([
			{
				type: "url",
				url: "https://assets.example.com/invoice.pdf",
				filename: "invoice.pdf",
			},
		]);

		expect(result.error).toBeUndefined();
		expect(result.data?.[0]?.content?.toString()).toBe("invoice");
	});

	test("returns lookup address arrays when Node requests all addresses", async () => {
		mocks.lookup.mockResolvedValueOnce([
			{
				address: "93.184.216.34",
				family: 4,
			},
		]);
		mockHttpsResponse({
			chunks: [Buffer.from("invoice")],
			useAllLookup: true,
		});

		const result = await resolveNodemailerAttachments([
			{
				type: "url",
				url: "https://assets.example.com/invoice.pdf",
				filename: "invoice.pdf",
			},
		]);

		expect(result.error).toBeUndefined();
		expect(result.data?.[0]?.content?.toString()).toBe("invoice");
	});

	test("uses configured timeout and max bytes when fetching attachments", async () => {
		mocks.lookup.mockResolvedValueOnce([
			{
				address: "93.184.216.34",
				family: 4,
			},
		]);
		mockHttpsResponse({
			headers: {
				"content-length": "6",
			},
		});

		const result = await resolveNodemailerAttachments(
			[
				{
					type: "url",
					url: "https://assets.example.com/invoice.pdf",
					filename: "invoice.pdf",
				},
			],
			{
				maxBytes: 5,
				timeoutMs: 1234,
			},
		);

		expect(result.error?.message).toBe("Attachment is too large.");
		expect(mocks.httpsRequest).toHaveBeenCalledWith(
			expect.any(URL),
			expect.objectContaining({
				timeout: 1234,
			}),
			expect.any(Function),
		);
	});
});
