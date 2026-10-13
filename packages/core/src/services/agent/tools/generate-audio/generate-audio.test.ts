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
import { createTranslationStore } from "../../../../libs/i18n/index.js";
import getGeneratedMedia from "../../../../libs/lucid-remote/services/get-generated-media/index.js";
import runCmsAiRequest from "../../../../libs/lucid-remote/services/run-cms-ai-request/index.js";
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
import uploadSingle from "../../../media/upload-single.js";
import insertConversation from "../../helpers/insert-conversation.js";
import { generateAudioAgentTool } from "./index.js";

vi.mock("../../../media/upload-single.js", () => ({ default: vi.fn() }));
vi.mock("../../../ai/features/get-media-model-options.js", () => ({
	default: vi.fn(),
}));
vi.mock(
	"../../../../libs/lucid-remote/services/run-cms-ai-request/index.js",
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
vi.mock("../../helpers/run-paid-tool-request.js", () => ({
	default: vi.fn(async (_context, props) => {
		const result = await props.send({
			accessToken: "token",
			requestId: paidRequestId,
			signal: new AbortController().signal,
		});
		return result.error
			? result
			: {
					error: undefined,
					data: { ...result.data, requestId: paidRequestId },
				};
	}),
}));
const paidRequestId = "paid-request";

const fixture = getTestConfig();
const tool = generateAudioAgentTool();
const agent = defineAgent({
	key: "narrator",
	name: "Narrator",
	description: "Tests audio generation.",
});
const mp3 = new Uint8Array([73, 68, 51, 4]);
const speechModel = (id: string, instructions: boolean) => ({
	id,
	name: id,
	description: "",
	format: "mp3",
	voices: [
		{
			id: "sarah",
			name: "Sarah",
			previewUrl: "https://lucid.test/voice-previews/sample.mp3",
		},
	],
	defaultVoice: "sarah",
	instructions,
	maxCharacters: 20_000,
});
let context: ServiceContext;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: {
			...config,
			ai: { ...config.ai, agents: { enabled: true, definitions: [agent] } },
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
		data: {
			default: "speech/plain",
			models: [
				speechModel("speech/plain", false),
				speechModel("speech/directed", true),
			],
		},
	});
	vi.mocked(runCmsAiRequest).mockReset();
	vi.mocked(runCmsAiRequest).mockResolvedValue({
		error: undefined,
		data: {
			mode: "async",
			status: "complete",
			requestId: "remote-1",
			feature: { key: "media.audio.generate", version: "v1" },
			output: {
				id: "aud_1",
				url: "https://api.lucid.test/aud_1.mp3",
				storageKey: "generated-media/aud_1.mp3",
				byteSize: mp3.length,
				mimeType: "audio/mpeg",
				extension: "mp3",
				voice: "sarah",
				characters: 24,
			},
			usage: {
				model: "speech/plain",
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
	});
	vi.mocked(getGeneratedMedia).mockImplementation(async () => ({
		error: undefined,
		data: {
			body: new Response(mp3).body as ReadableStream<Uint8Array>,
			contentType: "audio/mpeg",
			contentLength: mp3.length,
		},
	}));
	vi.mocked(uploadSingle).mockReset();
	//* Media tests cover storage; retain a database row for chat references.
	vi.mocked(uploadSingle).mockImplementation(async () => {
		const Media = new MediaRepository(context.db);
		const media = await Media.createSingle({
			data: {
				key: randomUUID(),
				storage_adapter_key: "test",
				origin: "ai_generated",
				public: false,
				status: "ready",
				type: "audio",
				mime_type: "audio/mpeg",
				file_extension: "mp3",
				file_size: mp3.length,
			},
			returning: ["id"],
			validation: { enabled: true },
		});
		assert(media.data, JSON.stringify(media.error));
		return { error: undefined, data: { id: media.data.id } };
	});
});

const executionFor = async (): Promise<AgentToolExecution> => {
	const chat = await insertConversation(context, {
		agentKey: agent.key,
		userId: null,
	});
	assert(chat.data, JSON.stringify(chat.error));
	return {
		authority: {
			principal: { type: "user", userId: 1 },
			superAdmin: false,
			permissions: [Permissions.AiAudioGenerate],
		},
		actor: { type: "user", userId: 1 },
		signal: new AbortController().signal,
		operationId: randomUUID(),
		run: {
			id: randomUUID(),
			conversationId: chat.data.id,
			agentKey: agent.key,
		},
	};
};
const input = {
	script: "Welcome to the article.",
	instruction: "Read it warmly.",
	title: "Article narration",
};

test("speaks the script with the default model and voice, leaving out instructions it can't follow", async () => {
	const execution = await executionFor();
	const result = await executeAgentTool({
		context,
		tool,
		input: { ...input, skipReview: true },
		execution,
	});
	assert(result.type === "success", JSON.stringify(result));

	expect(vi.mocked(runCmsAiRequest).mock.calls[0]?.[1]).toMatchObject({
		request: {
			feature: { key: "media.audio.generate", version: "v1" },
			input: [{ type: "text", role: "script", value: input.script }],
			generation: { model: "speech/plain", voice: "sarah" },
		},
	});
	const upload = vi.mocked(uploadSingle).mock.calls[0]?.[1];
	expect(upload).toMatchObject({
		ownerUserId: 1,
		origin: "ai_generated",
		title: [{ value: input.title }],
		file: { fileName: "aud_1.mp3", mimeType: "audio/mpeg" },
	});
	expect(upload).not.toHaveProperty("transcript");
});

test("a script longer than the model speaks fails before generating", async () => {
	vi.mocked(getMediaModelOptions).mockResolvedValueOnce({
		error: undefined,
		data: {
			default: "speech/plain",
			models: [{ ...speechModel("speech/plain", false), maxCharacters: 10 }],
		},
	});
	const result = await executeAgentTool({
		context,
		tool,
		input: { ...input, skipReview: true },
		execution: await executionFor(),
	});
	expect(result).toMatchObject({ type: "failed" });
	expect(runCmsAiRequest).not.toHaveBeenCalled();
});

test("chats check the settings first, then speak with the person's model, voice and instructions", async () => {
	const execution = await executionFor();
	const prepared = await prepareAgentTool({
		context,
		tool,
		input,
		execution,
	});
	assert(
		prepared.type === "success" && "interaction" in prepared.data,
		JSON.stringify(prepared),
	);
	expect(prepared.data.interaction.data).toEqual({
		script: input.script,
		title: input.title,
		instruction: input.instruction,
		model: null,
		voice: null,
	});

	const result = await executeAgentTool({
		context,
		tool,
		input,
		execution: {
			...execution,
			answer: {
				data: prepared.data.interaction.data,
				response: {
					...prepared.data.interaction.data,
					model: "speech/directed",
					voice: "sarah",
				},
			},
		},
	});
	assert(result.type === "success", JSON.stringify(result));
	expect(vi.mocked(runCmsAiRequest).mock.calls[0]?.[1]?.request).toMatchObject({
		input: [
			{ type: "text", role: "script", value: input.script },
			{ type: "text", role: "user-instruction", value: input.instruction },
		],
		generation: { model: "speech/directed", voice: "sarah" },
	});
});
