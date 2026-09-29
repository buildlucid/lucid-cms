import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import createServiceContext from "../../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../../utils/services/types.js";
import getTestConfig from "../../../../utils/test-helpers/get-test-config.js";
import { createTranslationStore } from "../../../i18n/index.js";
import {
	resourceAnalyzeRequestSchema,
	resourceSourceSchema,
} from "../../schema/resource.js";
import analyzeResource from "./index.js";

const testConfig = getTestConfig();
let context: ServiceContext;
beforeAll(async () => {
	context = createServiceContext({
		config: await testConfig.getConfig(),
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
});
afterAll(() => testConfig.destroy());
afterEach(() => vi.unstubAllGlobals());
const usage = {
	model: "google/gemini-3.1-flash-lite",
	tokens: {
		input: {
			text: 1,
			image: 0,
			audio: 0,
			cached: { total: 0, text: 0, image: 0, audio: 0 },
			total: 1,
		},
		output: {
			text: 1,
			image: 0,
			audio: 0,
			reasoning: 0,
			acceptedPrediction: 0,
			rejectedPrediction: 0,
			total: 1,
		},
		total: 2,
	},
	cost: { creditsCharged: "1" },
};
const request = resourceAnalyzeRequestSchema.parse({
	feature: { key: "resource.analyze", version: "v1" },
	sessionId: randomUUID(),
	input: [],
	context: {
		question: "Describe the image.",
		source: { type: "base64", data: "aGVsbG8=", mimeType: "image/png" },
	},
});
const result = {
	mode: "sync",
	requestId: randomUUID(),
	feature: request.feature,
	output: { analysis: "A mountain." },
	usage,
};

test("posts inline sources with the billing identity and parses analysis", async () => {
	const requests: Request[] = [];
	vi.stubGlobal("fetch", async (url: URL, init: RequestInit) => {
		requests.push(new Request(url, init));
		return Response.json({ data: result });
	});
	const requestId = randomUUID();
	const response = await analyzeResource(context, {
		requestId,
		request,
		accessToken: "test",
		signal: new AbortController().signal,
	});
	expect(response.data?.output).toEqual({ analysis: "A mountain." });
	expect(requests[0]?.headers.get("idempotency-key")).toBe(requestId);
	expect(await requests[0]?.json()).toEqual(request);
});

test("polls an existing analysis instead of resubmitting a paid request", async () => {
	const requests: Request[] = [];
	vi.stubGlobal("fetch", async (url: URL, init: RequestInit) => {
		requests.push(new Request(url, init));
		return requests.length === 1
			? Response.json(
					{
						status: 409,
						key: "cms_ai_request_in_progress",
						message: "Processing",
					},
					{ status: 409 },
				)
			: Response.json({ data: result });
	});
	const response = await analyzeResource(context, {
		requestId: randomUUID(),
		request,
		accessToken: "test",
		signal: new AbortController().signal,
	});
	expect(response.data?.output.analysis).toBe("A mountain.");
	expect(requests.map((item) => item.method)).toEqual(["POST", "GET"]);
});

test.each([
	{ ...result, feature: { key: "media.alt.generate", version: "v1" } },
	{ ...result, output: { title: "Wrong output" } },
])("rejects mismatched remote results", async (data) => {
	vi.stubGlobal("fetch", async () => Response.json({ data }));
	expect(
		(
			await analyzeResource(context, {
				requestId: randomUUID(),
				request,
				accessToken: "test",
				signal: new AbortController().signal,
			})
		).error?.status,
	).toBe(502);
});

test("accepts the largest inline input without overflowing the validator", () => {
	expect(
		resourceSourceSchema.safeParse({
			type: "base64",
			data: "A".repeat(8_000_000),
			mimeType: "application/pdf",
		}).success,
	).toBe(true);
	expect(
		resourceSourceSchema.safeParse({
			type: "base64",
			data: "a===",
			mimeType: "application/pdf",
		}).success,
	).toBe(false);
});
