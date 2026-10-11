import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import { controllerSchemas } from "../../../schemas/ai.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import storePendingGeneration from "../storage/store-pending-generation.js";
import mediaImageCompletion from "./media-image-completion.js";
import mediaImageStream from "./media-image-stream.js";

const remote = { request: vi.fn(), stream: vi.fn() };
vi.mock("../../../libs/lucid-remote/client.js", () => ({
	getLucidRemoteClient: () => remote,
}));
vi.mock("../../connection/token-manager.js", () => ({
	default: async () => ({
		error: undefined,
		data: { accessToken: "token", lucidRemoteConnectionId: connectionId },
	}),
}));

const fixture = getTestConfig();
let context: ServiceContext;
let connectionId: number;
let userId: number;

beforeAll(async () => {
	const config = await fixture.getConfig();
	const database = await fixture.getDatabase();
	context = createServiceContext({
		config,
		database,
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
	await fixture.migrate();
	connectionId = (
		await context.db.kysely
			.insertInto("lucid_remote_connections")
			.values({ status: "connected" })
			.returning("id")
			.executeTakeFirstOrThrow()
	).id;
	userId = (
		await context.db.kysely
			.insertInto("lucid_users")
			.values({
				email: "images@example.test",
				username: "images",
				secret: "test",
			})
			.returning("id")
			.executeTakeFirstOrThrow()
	).id;
});
afterAll(() => fixture.destroy());
beforeEach(() => {
	remote.request.mockReset();
	remote.stream.mockReset();
});

test("a finished generation links to the CMS, which streams the image with the access token", async () => {
	const requestId = randomUUID();
	await storePendingGeneration(context, {
		lucidRemoteConnectionId: connectionId,
		userId,
		session: { type: "media-image" },
		requestId,
		feature: { key: "media.image.generate", version: "v1" },
	});
	remote.request.mockResolvedValue({
		error: undefined,
		data: {
			response: new Response(),
			json: {
				data: {
					mode: "async",
					status: "complete",
					requestId,
					feature: { key: "media.image.generate", version: "v1" },
					output: {
						id: "img_1",
						url: "https://api.lucid.test/v1/cms/ai/images/generated-images%2F123e4567-e89b-12d3-a456-426614174000.webp",
						storageKey:
							"generated-images/123e4567-e89b-12d3-a456-426614174000.webp",
						byteSize: 4,
						mimeType: "image/webp",
						extension: "webp",
						size: "1024x1024",
						quality: "medium",
						outputFormat: "webp",
					},
					usage: {
						model: "image-model",
						tokens: {
							input: {
								text: 1,
								image: 0,
								audio: 0,
								cached: { total: 0, text: 0, image: 0, audio: 0 },
								total: 1,
							},
							output: {
								text: 0,
								image: 1,
								audio: 0,
								reasoning: 0,
								acceptedPrediction: 0,
								rejectedPrediction: 0,
								total: 1,
							},
							total: 2,
						},
						cost: { creditsCharged: "5" },
					},
				},
			},
		},
	});

	const completed = await mediaImageCompletion(context, { requestId });
	expect(completed.data).toMatchObject({
		output: {
			url: "/lucid/api/v1/ai/media-image/images/generated-images%2F123e4567-e89b-12d3-a456-426614174000.webp",
		},
	});

	remote.stream.mockResolvedValue({
		error: undefined,
		data: new Response(new Uint8Array([1, 2, 3, 4]), {
			headers: { "content-type": "image/webp", "content-length": "4" },
		}),
	});
	const image = await mediaImageStream(context, {
		storageKey: "generated-images/123e4567-e89b-12d3-a456-426614174000.webp",
	});
	expect(remote.stream).toHaveBeenCalledWith(
		"/v1/cms/ai/images/generated-images%2F123e4567-e89b-12d3-a456-426614174000.webp",
		expect.objectContaining({ accessToken: "token" }),
	);
	expect(image.data).toMatchObject({
		contentType: "image/webp",
		contentLength: 4,
	});
	expect(
		new Uint8Array(await new Response(image.data?.body).arrayBuffer()),
	).toEqual(new Uint8Array([1, 2, 3, 4]));
});

test("streaming refuses while image generation is off", async () => {
	const image = await mediaImageStream(
		{
			...context,
			config: {
				...context.config,
				ai: {
					...context.config.ai,
					features: { ...context.config.ai.features, imageGeneration: false },
				},
			},
		},
		{
			storageKey: "generated-images/123e4567-e89b-12d3-a456-426614174000.webp",
		},
	);
	expect(image.error?.status).toBe(403);
	expect(remote.stream).not.toHaveBeenCalled();
});

test("the stream route only accepts Lucid's generated image keys", () => {
	const { params } = controllerSchemas.mediaImageStream;
	expect(
		params.safeParse({
			key: "generated-images/123e4567-e89b-12d3-a456-426614174000.png",
		}).success,
	).toBe(true);
	for (const key of ["..", ".", "generated-images/../credits", "a/b.webp"]) {
		expect(params.safeParse({ key }).success).toBe(false);
	}
});
