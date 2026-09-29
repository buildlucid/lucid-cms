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
import {
	MAX_RESOURCE_BYTES,
	resourceAnalyzeResponseSchema,
} from "../../../../libs/lucid-remote/schema/resource.js";
import analyzeResource from "../../../../libs/lucid-remote/services/analyze-resource/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import {
	AgentMessagesRepository,
	MediaRepository,
} from "../../../../libs/repositories/index.js";
import { executeAgentTool } from "../../../../libs/tools/execute-tool.js";
import type { AgentToolExecution } from "../../../../libs/tools/types.js";
import type { AgentMessagePart } from "../../../../types/response.js";
import createServiceContext from "../../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../../utils/services/types.js";
import getTestConfig from "../../../../utils/test-helpers/get-test-config.js";
import streamMedia from "../../../media/stream.js";
import insertConversation from "../../helpers/insert-conversation.js";
import resolveRunSetup from "../../helpers/resolve-run-setup.js";
import register from "../../references/register.js";
import { analyzeResourceAgentTool } from "./index.js";
import resolveSource from "./resolve-source.js";

vi.mock("../../../media/stream.js", () => ({ default: vi.fn() }));
vi.mock(
	"../../../../libs/lucid-remote/services/analyze-resource/index.js",
	() => ({ default: vi.fn() }),
);
//* runs the request straight away, as billing is covered by the paid request tests
vi.mock("../../helpers/run-paid-tool-request.js", () => ({
	default: vi.fn((_context, props) =>
		props.send({
			accessToken: "token",
			requestId: "request",
			signal: new AbortController().signal,
		}),
	),
}));
const fixture = getTestConfig();
const analyzeResourceTool = analyzeResourceAgentTool();
const agent = defineAgent({
	key: "analysis",
	name: "Analysis",
	description: "Tests file analysis.",
	tools: [analyzeResourceTool],
});
const withoutAnalysis = defineAgent({
	key: "no-analysis",
	name: "No analysis",
	description: "Has no file tools.",
});
const analysis = (text: string) =>
	resourceAnalyzeResponseSchema.parse({
		mode: "sync",
		requestId: randomUUID(),
		feature: { key: "resource.analyze", version: "v1" },
		output: { analysis: text },
		usage: {
			model: "test-model",
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
		},
	});
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
let context: ServiceContext;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: {
			...config,
			ai: {
				...config.ai,
				agents: { definitions: [agent, withoutAnalysis] },
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
	vi.mocked(streamMedia).mockReset();
	vi.mocked(analyzeResource).mockReset();
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
			permissions: [Permissions.MediaRead],
		},
		signal: new AbortController().signal,
		operationId: randomUUID(),
		run: { id: randomUUID(), conversationId: chat.data.id, userId: null },
	};
};
const linkedMedia = async (
	execution: AgentToolExecution,
	props?: { fileSize?: number; mimeType?: string },
) => {
	const media = await new MediaRepository(context.db).createSingle({
		data: {
			key: randomUUID(),
			storage_adapter_key: "test",
			origin: "human",
			public: false,
			status: "ready",
			type: "image",
			mime_type: props?.mimeType ?? "image/png",
			file_extension: "png",
			file_size: props?.fileSize ?? 4,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	assert(media.data, JSON.stringify(media.error));
	expect(
		(
			await register(context, {
				conversationId: execution.run.conversationId,
				references: [{ type: "media", mediaId: media.data.id }],
				source: { type: "message" },
			})
		).error,
	).toBeUndefined();
	return { type: "media" as const, mediaId: media.data.id };
};
const writeMessage = async (
	execution: AgentToolExecution,
	role: "user" | "assistant",
	parts: AgentMessagePart[],
) => {
	const saved = await new AgentMessagesRepository(context.db).createSingle({
		data: {
			id: randomUUID(),
			conversation_id: execution.run.conversationId,
			run_id: null,
			position: 1,
			role,
			parts,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	expect(saved.error).toBeUndefined();
};

const mockFile = (bytes: Uint8Array) =>
	vi.mocked(streamMedia).mockResolvedValue({
		error: undefined,
		data: {
			body: new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(bytes);
					controller.close();
				},
			}),
			contentLength: bytes.length,
			contentType: "image/png",
			fileName: "private.png",
		},
	});

test("private linked media reaches analysis as base64 without a download URL", async () => {
	const execution = await executionFor();
	const source = await linkedMedia(execution);
	mockFile(png);
	vi.mocked(analyzeResource).mockResolvedValue({
		error: undefined,
		data: analysis("An image."),
	});
	const result = await executeAgentTool({
		context,
		tool: analyzeResourceTool,
		input: { source, question: "Describe it" },
		execution,
	});
	expect(result).toMatchObject({
		type: "success",
		data: { output: { analysis: "An image." } },
	});
	expect(vi.mocked(analyzeResource).mock.calls[0]?.[1].request.context).toEqual(
		{
			question: "Describe it",
			source: {
				type: "base64",
				data: Buffer.from(png).toString("base64"),
				mimeType: "image/png",
				filename: "private.png",
			},
		},
	);
});

test("a media reference in another chat grants no access", async () => {
	const source = await linkedMedia(await executionFor());
	const execution = await executionFor();
	expect(
		(await resolveSource(context, { source, execution })).error?.status,
	).toBe(403);
	expect(streamMedia).not.toHaveBeenCalled();
});

test("losing media read permission prevents analysis even while the reference remains", async () => {
	const execution = await executionFor();
	const source = await linkedMedia(execution);
	const result = await executeAgentTool({
		context,
		tool: analyzeResourceTool,
		input: { source, question: "Describe it" },
		execution: {
			...execution,
			authority: { ...execution.authority, permissions: [] },
		},
	});
	expect(result).toEqual({ type: "forbidden" });
	expect(streamMedia).not.toHaveBeenCalled();
	expect(analyzeResource).not.toHaveBeenCalled();
});

test.each([
	"unmentioned",
	"assistant",
	"history",
] as const)("rejects a URL whose only provenance is %s", async (origin) => {
	const execution = await executionFor();
	const url = "https://example.com/file.png";
	if (origin === "assistant")
		await writeMessage(execution, "assistant", [{ type: "text", text: url }]);
	if (origin === "history")
		await writeMessage(execution, "assistant", [
			{
				type: "tool",
				id: "call",
				name: "lucid_read_history",
				input: {},
				output: { url },
				status: "complete",
			},
		]);
	expect(
		(await resolveSource(context, { source: { type: "url", url }, execution }))
			.error?.status,
	).toBe(403);
});

test.each([
	"user",
	"tool",
] as const)("accepts URLs supplied by a %s", async (origin) => {
	const execution = await executionFor();
	const url = "https://example.com/file.png";
	await writeMessage(
		execution,
		origin === "user" ? "user" : "assistant",
		origin === "user"
			? [{ type: "text", text: `Please read ${url}` }]
			: [
					{
						type: "tool",
						id: "call",
						name: "web_search",
						input: {},
						output: { url },
						status: "complete",
					},
				],
	);
	expect(
		await resolveSource(context, { source: { type: "url", url }, execution }),
	).toEqual({ error: undefined, data: { type: "url", url } });
});

test.each([
	{ mimeType: "application/zip", fileSize: 4, status: 415 },
	{ mimeType: "image/png", fileSize: MAX_RESOURCE_BYTES + 1, status: 413 },
])("rejects metadata with $mimeType and $fileSize bytes before reading storage", async ({
	status,
	...props
}) => {
	const execution = await executionFor();
	const source = await linkedMedia(execution, props);
	expect(
		(await resolveSource(context, { source, execution })).error?.status,
	).toBe(status);
	expect(streamMedia).not.toHaveBeenCalled();
});

test("enforces the actual stream size when stored metadata understates it", async () => {
	const execution = await executionFor();
	const source = await linkedMedia(execution);
	mockFile(new Uint8Array(MAX_RESOURCE_BYTES + 1));
	expect(
		(await resolveSource(context, { source, execution })).error?.status,
	).toBe(413);
	expect(analyzeResource).not.toHaveBeenCalled();
});

test("sends a linked video whose contents match its type", async () => {
	const execution = await executionFor();
	const source = await linkedMedia(execution, { mimeType: "video/mp4" });
	const mp4 = new Uint8Array([
		0,
		0,
		0,
		24,
		...new TextEncoder().encode("ftypmp42"),
	]);
	mockFile(mp4);
	expect(await resolveSource(context, { source, execution })).toMatchObject({
		data: { type: "base64", mimeType: "video/mp4" },
	});
});

test("refuses a file whose contents do not match its stored type", async () => {
	const execution = await executionFor();
	const source = await linkedMedia(execution);
	mockFile(new TextEncoder().encode("<html>not a png</html>"));
	expect(
		(await resolveSource(context, { source, execution })).error?.status,
	).toBe(415);
});

test("analysis is offered only to agents that list it, and the prompt says what it opens", () => {
	const setup = (definition: typeof agent) =>
		resolveRunSetup(context, {
			agent: definition,
			authority: {
				principal: { type: "user", userId: 1 },
				superAdmin: false,
				permissions: [Permissions.MediaRead],
			},
			mode: "chat",
			hasHistory: false,
		});

	const listed = setup(agent);
	expect(listed.definitions.map((tool) => tool.name)).toContain(
		analyzeResourceTool.name,
	);
	expect(listed.instructions).toContain(
		`Open attached media with ${analyzeResourceTool.name}.`,
	);

	const unlisted = setup(withoutAnalysis);
	expect(unlisted.definitions.map((tool) => tool.name)).not.toContain(
		analyzeResourceTool.name,
	);
	expect(unlisted.instructions).toContain("No tool can open attached media.");
});
