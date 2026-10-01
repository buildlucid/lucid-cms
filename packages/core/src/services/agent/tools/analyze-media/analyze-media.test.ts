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
	MAX_MEDIA_BYTES,
	mediaAnalyzeResponseSchema,
} from "../../../../libs/lucid-remote/schema/media.js";
import analyzeMedia from "../../../../libs/lucid-remote/services/analyze-media/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import { MediaRepository } from "../../../../libs/repositories/index.js";
import { executeAgentTool } from "../../../../libs/tools/execute-tool.js";
import type { AgentToolExecution } from "../../../../libs/tools/types.js";
import createServiceContext from "../../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../../utils/services/types.js";
import getTestConfig from "../../../../utils/test-helpers/get-test-config.js";
import streamMedia from "../../../media/stream.js";
import insertConversation from "../../helpers/insert-conversation.js";
import resolveRunSetup from "../../helpers/resolve-run-setup.js";
import { analyzeMediaAgentTool } from "./index.js";
import resolveSource from "./resolve-source.js";

vi.mock("../../../media/stream.js", () => ({ default: vi.fn() }));
vi.mock(
	"../../../../libs/lucid-remote/services/analyze-media/index.js",
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
const analyzeMediaTool = analyzeMediaAgentTool();
const agent = defineAgent({
	key: "analysis",
	name: "Analysis",
	description: "Tests media analysis.",
});
const withoutAnalysis = defineAgent({
	key: "no-analysis",
	name: "No analysis",
	description: "Has no analysis tools.",
	features: { media: { analyze: false, readFile: false } },
});
const analysis = (text: string) =>
	mediaAnalyzeResponseSchema.parse({
		mode: "sync",
		requestId: randomUUID(),
		feature: { key: "media.analyze", version: "v1" },
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
	vi.mocked(analyzeMedia).mockReset();
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
const createMedia = async (props?: {
	fileSize?: number;
	mimeType?: string;
}) => {
	const Media = new MediaRepository(context.db);
	const mimeType = props?.mimeType ?? "image/png";
	const media = await Media.createSingle({
		data: {
			key: randomUUID(),
			storage_adapter_key: "test",
			origin: "human",
			public: false,
			status: "ready",
			type: mimeType.startsWith("image/")
				? "image"
				: mimeType.startsWith("audio/")
					? "audio"
					: mimeType.startsWith("video/")
						? "video"
						: "document",
			mime_type: mimeType,
			file_extension: mimeType.split("/")[1] ?? "bin",
			file_size: props?.fileSize ?? 4,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	assert(media.data, JSON.stringify(media.error));
	return media.data.id;
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

test("unreferenced private media reaches analysis as base64 without a download URL", async () => {
	const execution = await executionFor();
	const mediaId = await createMedia();
	mockFile(png);
	vi.mocked(analyzeMedia).mockResolvedValue({
		error: undefined,
		data: analysis("An image."),
	});
	const result = await executeAgentTool({
		context,
		tool: analyzeMediaTool,
		input: { mediaId, question: "Describe it" },
		execution,
	});
	expect(result).toMatchObject({
		type: "success",
		data: { output: { analysis: "An image." } },
	});
	expect(vi.mocked(analyzeMedia).mock.calls[0]?.[1].request.context).toEqual({
		question: "Describe it",
		source: {
			type: "base64",
			data: Buffer.from(png).toString("base64"),
			mimeType: "image/png",
			filename: "private.png",
		},
	});
});

test("losing media read permission prevents analysis of library media", async () => {
	const execution = await executionFor();
	const mediaId = await createMedia();
	const result = await executeAgentTool({
		context,
		tool: analyzeMediaTool,
		input: { mediaId, question: "Describe it" },
		execution: {
			...execution,
			authority: { ...execution.authority, permissions: [] },
		},
	});
	expect(result).toMatchObject({ type: "failed" });
	expect(streamMedia).not.toHaveBeenCalled();
	expect(analyzeMedia).not.toHaveBeenCalled();
});

test("rejects URL input before reading storage or requesting analysis", async () => {
	const result = await executeAgentTool({
		context,
		tool: analyzeMediaTool,
		input: {
			source: { type: "url", url: "https://example.com/file.png" },
			question: "Describe it",
		},
		execution: await executionFor(),
	});
	expect(result).toMatchObject({ type: "invalid-input" });
	expect(streamMedia).not.toHaveBeenCalled();
	expect(analyzeMedia).not.toHaveBeenCalled();
});

test.each([
	{ mimeType: "text/plain", fileSize: 4, status: 415 },
	{ mimeType: "text/markdown", fileSize: 4, status: 415 },
	{ mimeType: "text/csv", fileSize: 4, status: 415 },
	{ mimeType: "text/html", fileSize: 4, status: 415 },
	{ mimeType: "application/json", fileSize: 4, status: 415 },
	{ mimeType: "application/zip", fileSize: 4, status: 415 },
	{ mimeType: "image/png", fileSize: MAX_MEDIA_BYTES + 1, status: 413 },
])("rejects metadata with $mimeType and $fileSize bytes before reading storage", async ({
	status,
	...props
}) => {
	const execution = await executionFor();
	const mediaId = await createMedia(props);
	expect(
		(await resolveSource(context, { mediaId, execution })).error?.status,
	).toBe(status);
	expect(streamMedia).not.toHaveBeenCalled();
	expect(analyzeMedia).not.toHaveBeenCalled();
});

test("enforces the actual stream size when stored metadata understates it", async () => {
	const execution = await executionFor();
	const mediaId = await createMedia();
	mockFile(new Uint8Array(MAX_MEDIA_BYTES + 1));
	expect(
		(await resolveSource(context, { mediaId, execution })).error?.status,
	).toBe(413);
	expect(analyzeMedia).not.toHaveBeenCalled();
});

test.each([
	{
		mimeType: "application/pdf",
		bytes: new TextEncoder().encode("%PDF-1.7\n"),
	},
	{ mimeType: "audio/mpeg", bytes: new TextEncoder().encode("ID3") },
	{
		mimeType: "video/mp4",
		bytes: new Uint8Array([
			0,
			0,
			0,
			24,
			...new TextEncoder().encode("ftypmp42"),
		]),
	},
])("sends unreferenced $mimeType whose contents match its type", async ({
	mimeType,
	bytes,
}) => {
	const execution = await executionFor();
	const mediaId = await createMedia({ mimeType });
	mockFile(bytes);
	expect(await resolveSource(context, { mediaId, execution })).toMatchObject({
		data: {
			type: "base64",
			mimeType,
			data: Buffer.from(bytes).toString("base64"),
		},
	});
});

test("refuses a file whose contents do not match its stored type", async () => {
	const execution = await executionFor();
	const mediaId = await createMedia();
	mockFile(new TextEncoder().encode("<html>not a png</html>"));
	expect(
		(await resolveSource(context, { mediaId, execution })).error?.status,
	).toBe(415);
});

test("analysis is on by default without library permission and can be disabled", () => {
	const setup = (definition: typeof agent) =>
		resolveRunSetup(context, {
			agent: definition,
			authority: {
				principal: { type: "user", userId: 1 },
				superAdmin: false,
				permissions: [],
			},
			mode: "chat",
			hasHistory: false,
		});

	const listed = setup(agent);
	expect(listed.definitions.map((tool) => tool.name)).toContain(
		analyzeMediaTool.name,
	);
	expect(listed.instructions).toContain(
		`Analyse Lucid media with ${analyzeMediaTool.name}.`,
	);

	const unlisted = setup(withoutAnalysis);
	expect(unlisted.definitions.map((tool) => tool.name)).not.toContain(
		analyzeMediaTool.name,
	);
	expect(unlisted.instructions).toContain("No tool can read attached files.");
});
