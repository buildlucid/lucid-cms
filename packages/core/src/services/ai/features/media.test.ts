import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import type { Permission } from "../../../libs/permission/types.js";
import { controllerSchemas } from "../../../schemas/ai.js";
import type { LucidUser } from "../../../types/hono.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import resolveMediaModel from "../helpers/resolve-media-model.js";
import storePendingGeneration from "../storage/store-pending-generation.js";
import getMediaModelOptions from "./get-media-model-options.js";
import mediaCompletion from "./media-completion.js";
import mediaSave from "./media-save.js";
import mediaStream from "./media-stream.js";

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
				email: "media@example.test",
				username: "media",
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

const storageKey = "generated-media/123e4567-e89b-12d3-a456-426614174000.mp3";
const audio = new Uint8Array([73, 68, 51, 4]);
const userWith = (permissions: Permission[]): LucidUser => ({
	id: userId,
	username: "media",
	email: "media@example.test",
	superAdmin: false,
	permissions,
});
const audioUser = () => userWith([Permissions.AiAudioGenerate]);
const imageUser = () => userWith([Permissions.AiImageGenerate]);

/** Records a pending audio generation and has Lucid report it finished. */
const finishedAudio = async () => {
	const requestId = randomUUID();
	await storePendingGeneration(context, {
		lucidRemoteConnectionId: connectionId,
		userId,
		session: { type: "media-audio" },
		requestId,
		feature: { key: "media.audio.generate", version: "v1" },
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
					feature: { key: "media.audio.generate", version: "v1" },
					output: {
						id: "aud_1",
						url: `https://api.lucid.test/v1/cms/ai/media/${encodeURIComponent(storageKey)}`,
						storageKey,
						byteSize: audio.length,
						mimeType: "audio/mpeg",
						extension: "mp3",
						voice: "sarah",
						characters: 24,
					},
					usage: {
						model: "speech-model",
						tokens: {
							input: {
								text: 24,
								image: 0,
								audio: 0,
								cached: { total: 0, text: 0, image: 0, audio: 0 },
								total: 24,
							},
							output: {
								text: 0,
								image: 0,
								audio: 0,
								reasoning: 0,
								acceptedPrediction: 0,
								rejectedPrediction: 0,
								total: 0,
							},
							total: 24,
						},
						cost: { creditsCharged: "2" },
					},
				},
			},
		},
	});
	remote.stream.mockImplementation(async () => ({
		error: undefined,
		data: new Response(audio, {
			headers: { "content-type": "audio/mpeg", "content-length": "4" },
		}),
	}));

	const completed = await mediaCompletion(context, {
		requestId,
		user: audioUser(),
	});
	return { requestId, completed };
};

test("a finished generation reports its type and links to the CMS, which streams the file with the access token", async () => {
	const { completed } = await finishedAudio();
	expect(completed.data).toMatchObject({
		type: "audio",
		output: {
			voice: "sarah",
			url: `/api/v1/ai/media/files/${encodeURIComponent(storageKey)}`,
		},
	});

	const file = await mediaStream(context, { storageKey, user: audioUser() });
	expect(remote.stream).toHaveBeenCalledWith(
		`/v1/cms/ai/media/${encodeURIComponent(storageKey)}`,
		expect.objectContaining({ accessToken: "token" }),
	);
	expect(file.data).toMatchObject({
		contentType: "audio/mpeg",
		contentLength: 4,
	});
	expect(
		new Uint8Array(await new Response(file.data?.body).arrayBuffer()),
	).toEqual(audio);
});

test("saving copies the person's own generation into media storage under a key awaiting sync", async () => {
	const { requestId } = await finishedAudio();
	const upload = vi.fn(async () => ({ error: undefined, data: {} }));
	const storageContext = {
		...context,
		mediaStorage: { key: "test", upload },
	} as unknown as ServiceContext;
	const signal = new AbortController().signal;

	const someoneElse = await mediaSave(storageContext, {
		requestId,
		public: true,
		userId: userId + 1,
		signal,
	});
	expect(someoneElse.error?.status).toBe(404);

	const saved = await mediaSave(storageContext, {
		requestId,
		public: true,
		userId,
		signal,
	});
	expect(saved.data).toMatchObject({
		fileName: "aud_1.mp3",
		mimeType: "audio/mpeg",
		size: audio.length,
	});
	expect(upload).toHaveBeenCalledWith(
		storageContext,
		expect.objectContaining({ key: saved.data?.key, size: audio.length }),
	);
	const awaiting = await context.db.kysely
		.selectFrom("lucid_media_awaiting_sync")
		.select("key")
		.where("key", "=", saved.data?.key ?? "")
		.executeTakeFirst();
	expect(awaiting).toBeDefined();
});

test("checking a generation needs its own media type's permission", async () => {
	const { requestId } = await finishedAudio();
	const denied = await mediaCompletion(context, {
		requestId,
		user: imageUser(),
	});
	expect(denied.error?.status).toBe(403);
});

test("streaming checks the file's media type is on and the person may generate it", async () => {
	const imageOnly = {
		...context,
		config: {
			...context.config,
			ai: {
				...context.config.ai,
				mediaGeneration: {
					...context.config.ai.mediaGeneration,
					audio: { enabled: false, models: {} },
				},
			},
		},
	};
	expect(
		(await mediaStream(imageOnly, { storageKey, user: audioUser() })).error
			?.status,
	).toBe(403);
	expect(
		(await mediaStream(context, { storageKey, user: imageUser() })).error
			?.status,
	).toBe(403);
	expect(remote.stream).not.toHaveBeenCalled();
});

test("streaming forwards a byte range and reports the partial content", async () => {
	remote.stream.mockResolvedValue({
		error: undefined,
		data: new Response(audio.slice(0, 2), {
			status: 206,
			headers: {
				"content-type": "audio/mpeg",
				"content-length": "2",
				"content-range": "bytes 0-1/4",
				etag: '"aud_1"',
			},
		}),
	});
	const file = await mediaStream(context, {
		storageKey,
		range: "bytes=0-1",
		user: audioUser(),
	});
	expect(remote.stream).toHaveBeenCalledWith(
		expect.any(String),
		expect.objectContaining({ range: "bytes=0-1" }),
	);
	expect(file.data).toMatchObject({
		contentLength: 2,
		contentRange: "bytes 0-1/4",
		eTag: '"aud_1"',
	});
});

/** A config whose image models are narrowed as given, against a catalogue offering a, b and c with b as Lucid's default. */
const withImageModels = (models: {
	default?: string;
	available?: string[];
}) => {
	remote.request.mockResolvedValue({
		error: undefined,
		data: {
			response: new Response(),
			json: {
				data: {
					default: "b",
					models: ["a", "b", "c"].map((id) => ({
						id,
						name: id,
						aspectRatios: ["1:1"],
						resolutions: [],
						qualities: [],
						outputFormats: [],
						sourceImage: true,
					})),
				},
			},
		},
	});
	return {
		...context,
		config: {
			...context.config,
			ai: {
				...context.config.ai,
				mediaGeneration: {
					...context.config.ai.mediaGeneration,
					image: { enabled: true, models },
				},
			},
		},
	};
};

test("model options keep the configured models Lucid offers, or all of them when none are, and default to the configured choice", async () => {
	const pick = async (models: { default?: string; available?: string[] }) => {
		const options = await getMediaModelOptions(withImageModels(models), {
			type: "image",
		});
		return {
			default: options.data?.default,
			models: options.data?.models.map((model) => model.id),
			status: options.error?.status,
		};
	};

	expect(await pick({})).toEqual({
		default: "b",
		models: ["a", "b", "c"],
		status: undefined,
	});
	expect(await pick({ available: ["x", "c", "a"] })).toEqual({
		default: "c",
		models: ["a", "c"],
		status: undefined,
	});
	expect(await pick({ default: "a", available: ["c", "a"] })).toEqual({
		default: "a",
		models: ["a", "c"],
		status: undefined,
	});
	expect(await pick({ available: ["x"] })).toEqual({
		default: "b",
		models: ["a", "b", "c"],
		status: undefined,
	});
});

test("generations use the default model options, and reject models outside them", async () => {
	const restricted = withImageModels({ available: ["c", "a"] });
	const resolve = (modelId?: string) =>
		resolveMediaModel(restricted, { type: "image", modelId });

	expect((await resolve()).data).toBe("c");
	expect((await resolve("a")).data).toBe("a");
	expect((await resolve("b")).error?.status).toBe(400);
});

test("the stream route only accepts Lucid's generated media keys", () => {
	const { params } = controllerSchemas.mediaStream;
	for (const key of [
		storageKey,
		"generated-media/123e4567-e89b-12d3-a456-426614174000.png",
	]) {
		expect(params.safeParse({ key }).success).toBe(true);
	}
	for (const key of ["..", ".", "generated-media/../credits", "a/b.webp"]) {
		expect(params.safeParse({ key }).success).toBe(false);
	}
});
