import { randomUUID } from "node:crypto";
import {
	afterAll,
	assert,
	beforeAll,
	beforeEach,
	expect,
	test,
	vi,
} from "vitest";
import defineAgent from "../../../../libs/agent/define-agent.js";
import { copy, createTranslationStore } from "../../../../libs/i18n/index.js";
import { aiAccessFeatureSchema } from "../../../../libs/lucid-remote/schema/connection.js";
import generateMedia from "../../../../libs/lucid-remote/services/generate-media/index.js";
import getGeneratedMedia from "../../../../libs/lucid-remote/services/get-generated-media/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import { MediaRepository } from "../../../../libs/repositories/index.js";
import {
	executeAgentTool,
	prepareAgentTool,
} from "../../../../libs/tools/execute-tool.js";
import type { AgentToolExecution } from "../../../../libs/tools/types.js";
import createServiceContext from "../../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../../utils/services/types.js";
import getTestConfig from "../../../../utils/test-helpers/get-test-config.js";
import getMediaModelOptions from "../../../ai/features/get-media-model-options.js";
import streamMedia from "../../../media/stream.js";
import uploadSingle from "../../../media/upload-single.js";
import insertConversation from "../../helpers/insert-conversation.js";
import resolveRunSetup from "../../helpers/resolve-run-setup.js";
import { requestIdFor } from "../../helpers/run-paid-tool-request.js";
import listAdded from "../../references/list-added.js";
import register from "../../references/register.js";
import { editImageAgentTool } from "../edit-image/index.js";
import { generateImageAgentTool } from "./index.js";

vi.mock("../../../media/stream.js", () => ({ default: vi.fn() }));
vi.mock("../../../media/upload-single.js", () => ({ default: vi.fn() }));
vi.mock("../../../ai/features/get-media-model-options.js", () => ({
	default: vi.fn(),
}));
vi.mock(
	"../../../../libs/lucid-remote/services/generate-media/index.js",
	() => ({ default: vi.fn() }),
);
vi.mock(
	"../../../../libs/lucid-remote/services/get-generated-media/index.js",
	() => ({ default: vi.fn() }),
);
vi.mock("../../../connection/token-manager.js", () => ({
	default: async () => ({
		error: undefined,
		data: { accessToken: "token", lucidRemoteConnectionId: 1 },
	}),
}));
//* Paid-request tests cover billing; this mock executes the request directly.
vi.mock("../../helpers/run-paid-tool-request.js", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("../../helpers/run-paid-tool-request.js")
	>()),
	default: vi.fn((_context, props) =>
		props.send({
			accessToken: "token",
			requestId: requestIdFor(props.featureKey, props.execution.operationId),
			signal: new AbortController().signal,
		}),
	),
}));

const fixture = getTestConfig();
const generateImageTool = generateImageAgentTool();
const editImageTool = editImageAgentTool();
const agent = defineAgent({
	key: "illustrator",
	name: "Illustrator",
	description: "Tests image generation.",
});
const withoutUploads = defineAgent({
	key: "no-uploads",
	name: "No uploads",
	description: "Cannot move media into the library.",
	features: { media: { upload: false } },
});
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const imageModel = (
	id: string,
	options: {
		aspectRatios: string[];
		resolutions: string[];
		sourceImage?: boolean;
	},
) => ({
	id,
	name: id,
	description: "",
	aspectRatios: options.aspectRatios,
	resolutions: options.resolutions,
	qualities:
		options.resolutions.length > 0 ? [] : ["auto", "low", "medium", "high"],
	outputFormats: options.resolutions.length > 0 ? [] : ["webp", "png"],
	sourceImage: options.sourceImage ?? true,
});
const imageModels = [
	imageModel("image/formats", {
		aspectRatios: ["auto", "1:1", "3:2"],
		resolutions: [],
	}),
	imageModel("image/resolutions", {
		aspectRatios: ["1:1", "16:9"],
		resolutions: ["1K", "2K"],
	}),
	imageModel("image/text-only", {
		aspectRatios: ["1:1"],
		resolutions: [],
		sourceImage: false,
	}),
];
let context: ServiceContext;

const generated = (output?: Partial<{ mimeType: string; extension: string }>) =>
	vi.mocked(generateMedia).mockResolvedValue({
		error: undefined,
		data: {
			mode: "async",
			status: "complete",
			requestId: "remote-1",
			feature: { key: "media.image.generate", version: "v1" },
			output: {
				id: "img_1",
				url: "https://cdn.lucid.test/img_1.webp",
				storageKey: "images/img_1.webp",
				byteSize: png.length,
				mimeType: "image/webp",
				extension: "webp",
				aspectRatio: "1:1",
				resolution: null,
				quality: null,
				...output,
			},
			usage: {
				model: "test-image-model",
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
	});

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: {
			...config,
			ai: {
				...config.ai,
				agents: { enabled: true, definitions: [agent, withoutUploads] },
			},
		},
		database: await fixture.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
	await fixture.migrate();
});
afterAll(() => fixture.destroy());
beforeEach(() => {
	vi.mocked(getMediaModelOptions).mockResolvedValue({
		error: undefined,
		data: { default: "image/formats", models: imageModels },
	});
	vi.mocked(streamMedia).mockReset();
	vi.mocked(generateMedia).mockReset();
	vi.mocked(uploadSingle).mockReset();
	vi.mocked(getGeneratedMedia).mockReset();
	vi.mocked(getGeneratedMedia).mockImplementation(async () => ({
		error: undefined,
		data: {
			body: new Response(png).body as ReadableStream<Uint8Array>,
			contentType: "image/webp",
			contentLength: png.length,
		},
	}));
	//* Media tests cover storage; retain a database row for chat references.
	vi.mocked(uploadSingle).mockImplementation(async () => ({
		error: undefined,
		data: { id: await createMedia() },
	}));
});

const executionFor = async (
	principal: AgentToolExecution["authority"]["principal"] = {
		type: "user",
		userId: 1,
	},
	agentKey = agent.key,
	permissions: string[] = [Permissions.AiImageGenerate, Permissions.MediaRead],
): Promise<AgentToolExecution> => {
	const chat = await insertConversation(context, { agentKey, userId: null });
	assert(chat.data, JSON.stringify(chat.error));
	return {
		authority: {
			principal,
			superAdmin: false,
			permissions,
		},
		actor:
			principal.type === "user"
				? { kind: "user", userId: principal.userId }
				: { kind: "system" },
		signal: new AbortController().signal,
		operationId: randomUUID(),
		run: {
			id: randomUUID(),
			conversationId: chat.data.id,
			userId: principal.type === "user" ? principal.userId : null,
			agentKey,
		},
	};
};
const createMedia = async (mimeType = "image/webp") => {
	const Media = new MediaRepository(context.db);
	const media = await Media.createSingle({
		data: {
			key: randomUUID(),
			storage_adapter_key: "test",
			origin: "ai_generated",
			public: false,
			status: "ready",
			type: "image",
			mime_type: mimeType,
			file_extension: mimeType.split("/")[1] ?? "bin",
			file_size: png.length,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	assert(media.data, JSON.stringify(media.error));
	return media.data.id;
};
const locale = () => context.config.localization.defaultLocale;
let messagePosition = 0;
const markAnalysed = (execution: AgentToolExecution, mediaId: number) =>
	context.db.kysely
		.insertInto("lucid_agent_messages")
		.values({
			id: randomUUID(),
			conversation_id: execution.run.conversationId,
			run_id: null,
			role: "assistant",
			position: ++messagePosition,
			parts: [
				{
					type: "tool",
					id: randomUUID(),
					name: "media_analyze",
					summary: copy.literal("Analysed the image"),
					input: { mediaId, question: "What does it show?" },
					status: "complete",
				},
			],
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.execute();
const generate = (
	execution: AgentToolExecution,
	input: Record<string, unknown>,
	tool = generateImageTool,
) =>
	executeAgentTool({
		context,
		tool,
		input: { title: "Sunrise over hills", ...input },
		execution,
	});

test("generates an image for the person and saves it as their personal media, shown in the chat", async () => {
	const execution = await executionFor();
	generated();
	const result = await generate(execution, {
		instruction: "A sunrise over rolling hills",
		guidance: "natural",
		aspectRatio: "3:2",
		resolution: "2K",
	});
	assert(result.type === "success", JSON.stringify(result));
	assert("output" in result.data);

	const requestId = requestIdFor("media.image.generate", execution.operationId);
	expect(vi.mocked(generateMedia).mock.calls[0]?.[1]).toMatchObject({
		requestId,
		request: {
			feature: { key: "media.image.generate", version: "v1" },
			sessionId: execution.run.conversationId,
			input: [
				{
					type: "text",
					role: "user-instruction",
					value: "A sunrise over rolling hills",
				},
				{ type: "text", role: "guidance" },
			],
			generation: {
				model: "image/formats",
				aspectRatio: "3:2",
				quality: "auto",
				outputFormat: "webp",
			},
		},
	});
	//* the default model picks its own resolution, so the agent's is left out
	expect(vi.mocked(generateMedia).mock.calls[0]?.[1]?.request).toMatchObject({
		generation: { resolution: undefined },
	});
	expect(vi.mocked(getGeneratedMedia).mock.calls[0]?.[1]).toEqual({
		accessToken: "token",
		storageKey: "images/img_1.webp",
		signal: execution.signal,
	});
	expect(vi.mocked(uploadSingle).mock.calls[0]?.[1]).toMatchObject({
		userId: 1,
		ownerUserId: 1,
		public: false,
		origin: "ai_generated",
		aiGenerationRequestId: requestId,
		title: [{ localeCode: locale(), value: "Sunrise over hills" }],
		alt: [{ localeCode: locale(), value: "Sunrise over hills" }],
		file: { fileName: "img_1.webp", mimeType: "image/webp" },
	});

	const mediaId = result.data.output.media.id;
	expect(result.data.output).toMatchObject({
		media: { fileName: "img_1.webp", personal: true },
		requestId,
		note: expect.stringContaining("media_add_to_library"),
	});
	expect(result.data.widgets).toEqual([
		{ key: "lucid-media-preview", version: 1, data: { mediaIds: [mediaId] } },
	]);
	expect(result.data.changes).toEqual([{ type: "media", mediaId }]);
	const linked = await listAdded(context, {
		conversationId: execution.run.conversationId,
		since: new Date(0).toISOString(),
	});
	expect(linked.data).toEqual([{ type: "media", mediaId }]);
});

test("edits a Lucid image the person asked to change, and marks the result as modified", async () => {
	const execution = await executionFor();
	const editId = await createMedia("image/png");
	await markAnalysed(execution, editId);
	vi.mocked(streamMedia).mockResolvedValue({
		error: undefined,
		data: {
			body: new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(png);
					controller.close();
				},
			}),
			contentLength: png.length,
			contentType: "image/png",
			fileName: "source.png",
		},
	});
	generated();
	const result = await generate(
		execution,
		{ instruction: "Make it dusk", mediaId: editId, alt: "Hills at dusk" },
		editImageTool,
	);
	assert(result.type === "success", JSON.stringify(result));
	assert("output" in result.data);

	expect(
		vi.mocked(generateMedia).mock.calls[0]?.[1]?.request.input,
	).toContainEqual({
		type: "image",
		role: "source-image",
		image: {
			type: "base64",
			data: Buffer.from(png).toString("base64"),
			mimeType: "image/png",
			filename: "source.png",
		},
	});
	expect(vi.mocked(uploadSingle).mock.calls[0]?.[1]).toMatchObject({
		origin: "ai_modified",
		alt: [{ localeCode: locale(), value: "Hills at dusk" }],
	});
	expect(context.translate(result.data.summary)).toContain(`${editId}`);
});

test("edits without a chosen model use the first model that takes a source image", async () => {
	const execution = await executionFor();
	const editId = await createMedia("image/png");
	await markAnalysed(execution, editId);
	vi.mocked(streamMedia).mockResolvedValue({
		error: undefined,
		data: {
			body: new Response(png).body as ReadableStream<Uint8Array>,
			contentLength: png.length,
			contentType: "image/png",
			fileName: "source.png",
		},
	});
	vi.mocked(getMediaModelOptions).mockResolvedValueOnce({
		error: undefined,
		data: {
			default: "image/text-only",
			models: imageModels.toReversed(),
		},
	});
	generated();
	const result = await generate(
		execution,
		{ instruction: "Make it dusk", mediaId: editId, skipReview: true },
		editImageTool,
	);
	assert(result.type === "success", JSON.stringify(result));
	expect(vi.mocked(generateMedia).mock.calls[0]?.[1]?.request).toMatchObject({
		generation: { model: "image/resolutions" },
	});
});

test("editing fails before generating when no model takes a source image", async () => {
	const execution = await executionFor();
	const editId = await createMedia("image/png");
	await markAnalysed(execution, editId);
	vi.mocked(getMediaModelOptions).mockResolvedValueOnce({
		error: undefined,
		data: {
			default: "image/text-only",
			models: imageModels.filter((model) => !model.sourceImage),
		},
	});
	const result = await generate(
		execution,
		{ instruction: "Make it dusk", mediaId: editId, skipReview: true },
		editImageTool,
	);
	expect(result).toMatchObject({
		type: "failed",
		message: context.translate(
			"server:agent.media.generate.source.unsupported",
		),
	});
	expect(generateMedia).not.toHaveBeenCalled();
});

test("system runs save straight to the library, and agents without uploads are not told to move it", async () => {
	generated();
	const system = await generate(
		await executionFor({ type: "system" }, withoutUploads.key),
		{ instruction: "A library image" },
	);
	assert(system.type === "success", JSON.stringify(system));
	assert("output" in system.data);
	expect(vi.mocked(uploadSingle).mock.calls[0]?.[1]).toMatchObject({
		userId: null,
		ownerUserId: null,
		public: true,
	});
	expect(system.data.output.media.personal).toBe(false);
	expect(system.data.output.note).not.toContain("media_add_to_library");

	generated();
	const personal = await generate(
		await executionFor({ type: "user", userId: 1 }, withoutUploads.key),
		{ instruction: "A personal image" },
	);
	assert(personal.type === "success", JSON.stringify(personal));
	assert("output" in personal.data);
	expect(personal.data.output.media.personal).toBe(true);
	expect(personal.data.output.note).not.toContain("media_add_to_library");
});

test("library saves media ready for documents, and needs permission to add to the library", async () => {
	generated();
	const execution = await executionFor({ type: "user", userId: 1 }, agent.key, [
		Permissions.AiImageGenerate,
		Permissions.MediaCreate,
	]);
	const saved = await generate(
		{
			...execution,
			screen: {
				type: "document",
				tabId: "tab",
				label: "Home",
				collectionKey: "page",
				documentId: 1,
				requestId: null,
			},
		},
		{ instruction: "A hero image", library: true },
	);
	assert(saved.type === "success", JSON.stringify(saved));
	assert("output" in saved.data);
	expect(vi.mocked(uploadSingle).mock.calls[0]?.[1]).toMatchObject({
		userId: 1,
		ownerUserId: null,
		public: true,
	});
	expect(saved.data.output.media.personal).toBe(false);
	expect(saved.data.output.note).toContain("lucid_builder_update");
	expect(saved.data.output.note).toContain("don't preview or link it again");

	vi.mocked(uploadSingle).mockClear();
	const denied = await generate(await executionFor(), {
		instruction: "A hero image",
		library: true,
	});
	expect(denied).toMatchObject({
		type: "failed",
		message: context.translate("server:agent.media.generate.library.denied"),
	});
	expect(uploadSingle).not.toHaveBeenCalled();
});

test("chats check the settings first unless told to skip, then generate with the person's changes", async () => {
	const execution = await executionFor();
	const input = {
		title: "Sunrise over hills",
		instruction: "A sunrise",
		aspectRatio: "16:9",
	};
	expect(
		await prepareAgentTool({
			context,
			tool: generateImageTool,
			input: { ...input, skipReview: true },
			execution,
		}),
	).toEqual({ type: "success", data: { proceed: true } });

	const prepared = await prepareAgentTool({
		context,
		tool: generateImageTool,
		input,
		execution,
	});
	assert(
		prepared.type === "success" && "interaction" in prepared.data,
		JSON.stringify(prepared),
	);
	expect(prepared.data.interaction).toMatchObject({
		placement: "composer",
		data: {
			instruction: "A sunrise",
			title: "Sunrise over hills",
			alt: null,
			guidance: null,
			aspectRatio: "16:9",
			resolution: null,
			quality: null,
			outputFormat: null,
			model: null,
			editMediaId: null,
		},
	});

	generated();
	const result = await executeAgentTool({
		context,
		tool: generateImageTool,
		input,
		execution: {
			...execution,
			interaction: {
				data: prepared.data.interaction.data,
				response: {
					instruction: "A sunset",
					title: "Sunset over hills",
					alt: null,
					guidance: "cinematic",
					aspectRatio: "16:9",
					resolution: "2K",
					quality: null,
					outputFormat: null,
					model: "image/resolutions",
				},
			},
		},
	});
	assert(result.type === "success", JSON.stringify(result));
	expect(vi.mocked(generateMedia).mock.calls[0]?.[1]?.request).toMatchObject({
		input: [
			{ type: "text", role: "user-instruction", value: "A sunset" },
			{ type: "text", role: "guidance" },
		],
		generation: {
			model: "image/resolutions",
			aspectRatio: "16:9",
			resolution: "2K",
		},
	});
	expect(vi.mocked(uploadSingle).mock.calls[0]?.[1]).toMatchObject({
		title: [{ localeCode: locale(), value: "Sunset over hills" }],
		alt: [{ localeCode: locale(), value: "Sunset over hills" }],
	});
});

test("editing an image the agent hasn't seen asks it to look first, unless it can't", async () => {
	const execution = await executionFor();
	const unseen = await createMedia("image/png");
	const input = { title: "Edited", instruction: "Add a fez", mediaId: unseen };
	const prepare = () =>
		prepareAgentTool({ context, tool: editImageTool, input, execution });

	expect(await prepare()).toMatchObject({
		type: "failed",
		message: expect.stringContaining("media_analyze"),
	});
	expect(
		await executeAgentTool({ context, tool: editImageTool, input, execution }),
	).toMatchObject({ type: "failed" });
	expect(generateMedia).not.toHaveBeenCalled();

	await markAnalysed(execution, unseen);
	expect(await prepare()).toMatchObject({ type: "success" });
	//* reattaching must preserve evidence of prior analysis
	await register(context, {
		conversationId: execution.run.conversationId,
		references: [{ type: "media", mediaId: unseen }],
		source: { type: "message" },
	});
	expect(await prepare()).toMatchObject({ type: "success" });

	const withoutAnalysis = defineAgent({
		key: "no-analysis",
		name: "No analysis",
		description: "Can't look at images.",
		features: { media: { analyze: false } },
	});
	const blind = await executionFor(
		{ type: "user", userId: 1 },
		withoutAnalysis.key,
	);
	expect(
		await prepareAgentTool({
			context: {
				...context,
				config: {
					...context.config,
					ai: {
						...context.config.ai,
						agents: {
							enabled: true,
							definitions: [agent, withoutUploads, withoutAnalysis],
						},
					},
				},
			},
			tool: editImageTool,
			input: { ...input, mediaId: await createMedia("image/png") },
			execution: blind,
		}),
	).toMatchObject({ type: "success" });
});

test("editing checks the image before asking about settings", async () => {
	const other = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${randomUUID()}@example.test`,
			username: randomUUID(),
			secret: "test",
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	const personal = await createMedia("image/png");
	await context.db.kysely
		.updateTable("lucid_media")
		.set({ owner_user_id: other.id })
		.where("id", "=", personal)
		.execute();
	const execution = await executionFor({ type: "user", userId: other.id + 1 });
	const asked = (mediaId: number) =>
		prepareAgentTool({
			context,
			tool: editImageTool,
			input: { title: "Edited", instruction: "Make it dusk", mediaId },
			execution,
		});

	expect(await asked(personal)).toMatchObject({ type: "failed" });
	expect(await asked(999_999)).toMatchObject({ type: "failed" });

	const library = await createMedia("image/png");
	await markAnalysed(execution, library);
	const prepared = await asked(library);
	assert(prepared.type === "success", JSON.stringify(prepared));
	expect(prepared.data).toMatchObject({
		interaction: { data: { editMediaId: library } },
	});
});

test("a failed download fails the call without saving media", async () => {
	generated();
	vi.mocked(getGeneratedMedia).mockResolvedValue({
		data: undefined,
		error: { type: "basic", status: 401, message: "Unauthorised" },
	});
	const result = await generate(await executionFor(), {
		instruction: "Anything",
	});
	expect(result).toMatchObject({
		type: "failed",
		message: context.translate("server:agent.media.generate.download.failed"),
	});
	expect(uploadSingle).not.toHaveBeenCalled();
});

test("the tool needs its permission and the CMS feature, and is off when the agent disables it", () => {
	const setup = (permissions: string[], imageGeneration = true) =>
		resolveRunSetup(
			{
				config: {
					...context.config,
					ai: {
						...context.config.ai,
						mediaGeneration: {
							...context.config.ai.mediaGeneration,
							image: {
								...context.config.ai.mediaGeneration.image,
								enabled: imageGeneration,
							},
						},
					},
				},
			},
			{
				agent,
				aiAccess: aiAccessFeatureSchema.options,
				authority: {
					principal: { type: "system" },
					permissions,
					superAdmin: false,
				},
				mode: "chat",
				hasHistory: false,
			},
		).tools.map((tool) => tool.name);

	expect(setup([Permissions.AiImageGenerate])).toEqual(
		expect.arrayContaining(["media_generate_image", "media_edit_image"]),
	);
	expect(setup([])).not.toContain("media_generate_image");
	expect(setup([Permissions.AiImageGenerate], false)).not.toContain(
		"media_generate_image",
	);
	expect(
		defineAgent({
			key: "plain",
			name: "Plain",
			description: "No image generation.",
			features: { media: { generate: { image: false } } },
		})
			.tools.map((tool) => tool.name)
			.filter((name) => name.startsWith("media_") && name.endsWith("_image")),
	).toEqual([]);
});
