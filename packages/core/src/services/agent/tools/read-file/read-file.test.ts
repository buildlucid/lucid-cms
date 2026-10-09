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
import { Permissions } from "../../../../libs/permission/definitions.js";
import {
	AgentMediaReferencesRepository,
	MediaRepository,
	UsersRepository,
} from "../../../../libs/repositories/index.js";
import { executeAgentTool } from "../../../../libs/tools/execute-tool.js";
import type { AgentToolExecution } from "../../../../libs/tools/types.js";
import createServiceContext from "../../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../../utils/services/types.js";
import getTestConfig from "../../../../utils/test-helpers/get-test-config.js";
import streamMedia from "../../../media/stream.js";
import insertConversation from "../../helpers/insert-conversation.js";
import resolveRunSetup from "../../helpers/resolve-run-setup.js";
import {
	FILE_PAGE_CHARS,
	FILE_RESULT_CHARS,
	MAX_FILE_BYTES,
} from "./constants.js";
import { readFileAgentTool } from "./index.js";
import readPassages from "./read-passages.js";
import { inputSchema, outputSchema } from "./schema.js";

vi.mock("../../../media/stream.js", () => ({ default: vi.fn() }));

const fixture = getTestConfig();
const tool = readFileAgentTool();
const agent = defineAgent({
	key: "files",
	name: "Files",
	description: "Reads files.",
});
let context: ServiceContext;
let ownerId: number;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: {
			...config,
			ai: { ...config.ai, agents: { definitions: [agent] } },
		},
		database: await fixture.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
	await fixture.migrate();
	const Users = new UsersRepository(context.db);
	const user = await Users.createSingle({
		data: { email: "files@example.test", username: "files", secret: "test" },
		returning: ["id"],
		validation: { enabled: true },
	});
	assert(user.data, JSON.stringify(user.error));
	ownerId = user.data.id;
});
afterAll(() => fixture.destroy());
beforeEach(() => vi.mocked(streamMedia).mockReset());

const executionFor = async (): Promise<AgentToolExecution> => {
	const chat = await insertConversation(context, {
		agentKey: agent.key,
		userId: null,
	});
	assert(chat.data, JSON.stringify(chat.error));
	return {
		authority: {
			principal: { type: "user", userId: ownerId },
			superAdmin: false,
			permissions: [Permissions.MediaRead],
		},
		actor: { kind: "user", userId: ownerId },
		signal: new AbortController().signal,
		operationId: randomUUID(),
		run: { id: randomUUID(), conversationId: chat.data.id, userId: null },
	};
};

const createFile = async (
	props: { mimeType?: string; fileSize?: number } = {},
) => {
	const Media = new MediaRepository(context.db);
	const file = await Media.createSingle({
		data: {
			key: randomUUID(),
			storage_adapter_key: "test",
			origin: "human",
			public: false,
			status: "ready",
			type: "document",
			mime_type: props.mimeType ?? "text/plain",
			file_extension: "txt",
			file_size: props.fileSize ?? 10,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	assert(file.data, JSON.stringify(file.error));
	return file.data.id;
};

const mockFile = (bytes: Uint8Array | ReadableStream<Uint8Array>) => {
	const body =
		bytes instanceof ReadableStream
			? bytes
			: new ReadableStream<Uint8Array>({
					start(controller) {
						controller.enqueue(bytes);
						controller.close();
					},
				});
	vi.mocked(streamMedia).mockResolvedValue({
		error: undefined,
		data: {
			body,
			contentLength: null,
			contentType: "text/plain",
			fileName: "notes.txt",
		},
	});
};

const read = async (
	mediaId: number,
	execution: AgentToolExecution,
	input: { search?: string | null; offset?: number } = {},
) =>
	executeAgentTool({
		context,
		tool,
		input: { mediaId, search: null, ...input },
		execution,
	});

test.each([
	["text/plain", "\ufeffNotes in English, 日本語 and 🦭."],
	["text/markdown", "# Notes\n\n**Keep** the formatting."],
	["text/csv", "name,total\nWill,12\n"],
	["application/json", '{"name":"Will","total":12}'],
	["application/xml", "<notes><name>Will</name></notes>"],
	["text/xml", "<notes />"],
])("reads %s as text without sending it to another model", async (mimeType, text) => {
	const execution = await executionFor();
	const mediaId = await createFile({ mimeType });
	mockFile(new TextEncoder().encode(text));
	const result = await read(mediaId, execution);
	assert(result.type === "success", JSON.stringify(result));
	expect(outputSchema.parse(result.data.output)).toMatchObject({
		mediaId,
		mimeType,
		contentType: "text",
		mode: "read",
		passages: [{ offset: 0, text: text.replace(/^\ufeff/, "") }],
		nextOffset: null,
		truncated: false,
	});
});

test("extracts HTML structure, links, alt text and table rows without scripts, styles, image sources or network access", async () => {
	const execution = await executionFor();
	const mediaId = await createFile({ mimeType: "text/html" });
	mockFile(
		new TextEncoder().encode(
			'<html><head><style>.secret{}</style><script>fetch("https://tracker.example")</script></head><body><h1>Policy &amp; terms</h1><p>Cancel within 30 days.</p><script>hidden instructions</script><a href="https://example.com/terms">Terms</a><img src="https://tracker.example/pixel"><img alt="Signed form" src="https://tracker.example/form"><table><thead><tr><th>Plan</th><th>Refund</th></tr></thead><tbody><tr><td><p>Annual</p></td><td>Full</td></tr></tbody></table></body></html>',
		),
	);
	const result = await read(mediaId, execution);
	assert(result.type === "success", JSON.stringify(result));
	const output = outputSchema.parse(result.data.output);
	expect(output.contentType).toBe("extracted-text");
	expect(output.passages[0]?.text).toContain("Policy & terms");
	expect(output.passages[0]?.text).toContain("Cancel within 30 days.");
	expect(output.passages[0]?.text).toContain(
		"Terms [https://example.com/terms]",
	);
	expect(output.passages[0]?.text).toContain("[Image: Signed form]");
	expect(output.passages[0]?.text).toContain("Plan | Refund\nAnnual | Full");
	expect(output.passages[0]?.text).not.toMatch(
		/secret|fetch|hidden instructions|tracker/,
	);
});

test("current library permission and personal ownership govern file access", async () => {
	const Media = new MediaRepository(context.db);
	const execution = await executionFor();
	const mediaId = await createFile();
	expect(
		(
			await read(mediaId, {
				...execution,
				authority: { ...execution.authority, permissions: [] },
			})
		).type,
	).toBe("failed");
	expect(
		(
			await Media.updateSingle({
				where: [{ key: "id", operator: "=", value: mediaId }],
				data: { owner_user_id: ownerId },
			})
		).error,
	).toBeUndefined();
	mockFile(new TextEncoder().encode("Personal notes"));
	expect(
		(
			await read(mediaId, {
				...execution,
				authority: { ...execution.authority, permissions: [] },
			})
		).type,
	).toBe("success");
	vi.mocked(streamMedia).mockClear();
	const otherUser: AgentToolExecution = {
		...execution,
		authority: {
			...execution.authority,
			principal: { type: "user", userId: ownerId + 1 },
			superAdmin: true,
		},
	};
	//* another user's personal file fails exactly as a missing one does
	const denied = await read(mediaId, otherUser);
	expect(denied.type).toBe("failed");
	expect(denied).toEqual(await read(2_147_483_000, otherUser));
	expect(streamMedia).not.toHaveBeenCalled();
});

test("reading links the file to the chat, and a failed read does not", async () => {
	const References = new AgentMediaReferencesRepository(context.db);
	const execution = await executionFor();
	const mediaId = await createFile();
	const linked = async () => {
		const references = await References.selectMultiple({
			select: ["media_id"],
			where: [
				{
					key: "conversation_id",
					operator: "=",
					value: execution.run.conversationId,
				},
			],
			validation: { enabled: true },
		});
		assert(references.data, JSON.stringify(references.error));
		return references.data.map((reference) => reference.media_id);
	};

	mockFile(new Uint8Array([65, 0, 66]));
	expect((await read(mediaId, execution)).type).toBe("failed");
	expect(await linked()).toEqual([]);

	mockFile(new TextEncoder().encode("Notes"));
	expect((await read(mediaId, execution)).type).toBe("success");
	expect(await linked()).toEqual([mediaId]);
});

test.each([
	"application/pdf",
	"image/png",
	"application/zip",
])("rejects %s before reading storage", async (mimeType) => {
	const execution = await executionFor();
	const mediaId = await createFile({ mimeType });
	expect((await read(mediaId, execution)).type).toBe("failed");
	expect(streamMedia).not.toHaveBeenCalled();
});

test("enforces recorded and actual byte limits", async () => {
	const execution = await executionFor();
	const oversized = await createFile({
		fileSize: MAX_FILE_BYTES + 1,
	});
	expect((await read(oversized, execution)).type).toBe("failed");
	expect(streamMedia).not.toHaveBeenCalled();
	const understated = await createFile();
	const cancel = vi.fn();
	mockFile(
		new ReadableStream({
			start(controller) {
				controller.enqueue(new Uint8Array(MAX_FILE_BYTES + 1));
			},
			cancel,
		}),
	);
	expect((await read(understated, execution)).type).toBe("failed");
	expect(cancel).toHaveBeenCalledOnce();
});

test("reads UTF-16 text marked with a byte order mark", async () => {
	const execution = await executionFor();
	const mediaId = await createFile({ mimeType: "text/csv" });
	mockFile(new Uint8Array([0xff, 0xfe, 65, 0, 44, 0, 66, 0]));
	const result = await read(mediaId, execution);
	assert(result.type === "success", JSON.stringify(result));
	expect(outputSchema.parse(result.data.output).passages[0]?.text).toBe("A,B");
});

test.each([
	new Uint8Array([0xfe, 0xff, 0xd8, 0x00]),
	new Uint8Array([65, 0, 66]),
])("rejects other encodings and binary data", async (bytes) => {
	const execution = await executionFor();
	const mediaId = await createFile();
	mockFile(bytes);
	expect((await read(mediaId, execution)).type).toBe("failed");
});

test("cancellation closes a pending storage stream", async () => {
	const execution = await executionFor();
	const mediaId = await createFile();
	const controller = new AbortController();
	const cancel = vi.fn();
	mockFile(
		new ReadableStream({
			pull() {
				controller.abort();
			},
			cancel,
		}),
	);
	expect(
		(await read(mediaId, { ...execution, signal: controller.signal })).type,
	).toBe("failed");
	expect(cancel).toHaveBeenCalledOnce();
});

test("advertises a default file reader and allows opting out", () => {
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
	expect(tool.requiresApproval).toBe(false);
	expect(setup(agent).instructions).toContain(
		`Read Lucid text files with ${tool.name}.`,
	);
	const disabled = defineAgent({
		key: "disabled",
		name: "Disabled",
		description: "No reader",
		features: { media: { readFile: false } },
	});
	expect(setup(disabled).definitions.map((tool) => tool.name)).not.toContain(
		tool.name,
	);
});

const passages = (
	text: string,
	input: { offset?: number; search?: string | null } = {},
) =>
	readPassages({
		text,
		input: inputSchema.parse({ mediaId: 1, search: null, ...input }),
		file: { mimeType: "text/plain", contentType: "text" },
	});

test("pages escaped text without losing content or exceeding either result budget", () => {
	const text = '\n"\\🦭'.repeat(2500);
	let offset = 0;
	let recovered = "";
	do {
		const output = passages(text, { offset });
		expect(JSON.stringify(output).length).toBeLessThanOrEqual(
			FILE_RESULT_CHARS,
		);
		expect(output.passages[0]?.text.length).toBeLessThanOrEqual(
			FILE_PAGE_CHARS,
		);
		assert(output.passages[0]);
		expect(output.passages[0].text.isWellFormed()).toBe(true);
		recovered += output.passages[0].text;
		expect(output.nextOffset === null || output.nextOffset > offset).toBe(true);
		if (output.nextOffset === null) break;
		offset = output.nextOffset;
	} while (offset < text.length);
	expect(recovered).toBe(text);
});

test("searches literal text across a large single line and continues past five passages", () => {
	const text = Array.from(
		{ length: 7 },
		(_, i) =>
			`${"x".repeat(2000)} Policy [${i % 2 ? "A+B" : "a+b"}] ${"y".repeat(2000)}`,
	).join("");
	const first = passages(text, { search: "[a+b]" });
	expect(first.passages).toHaveLength(5);
	expect(first.truncated).toBe(true);
	assert(first.nextOffset !== null);
	const second = passages(text, { search: "[a+b]", offset: first.nextOffset });
	expect(second.passages).toHaveLength(2);
	expect(second.nextOffset).toBeNull();
	for (const output of [first, second]) {
		expect(JSON.stringify(output).length).toBeLessThanOrEqual(
			FILE_RESULT_CHARS,
		);
		for (const found of output.passages) {
			expect(found.text.toLowerCase()).toContain("[a+b]");
			expect(text.slice(found.offset, found.offset + found.text.length)).toBe(
				found.text,
			);
		}
	}
	expect(passages(text, { search: "missing" }).passages).toEqual([]);
});

test("search matches phrases wrapped across lines and keeps context when continuing", () => {
	const text = Array.from(
		{ length: 6 },
		(_, i) => `${"x".repeat(1200)} Cancel within\n  30 days (${i}).`,
	).join("");
	const first = passages(text, { search: "within 30 days" });
	expect(first.passages).toHaveLength(5);
	assert(first.nextOffset !== null);
	const next = passages(text, {
		search: "within 30 days",
		offset: first.nextOffset,
	});
	expect(next.passages[0]?.text).toMatch(
		/^x+ Cancel within\n {2}30 days \(5\)/,
	);
});

test("search continuation still finds matches when escaping exhausts the result budget", () => {
	const text = Array.from(
		{ length: 10 },
		() => `${'"\\'.repeat(1200)}needle${'"\\'.repeat(1200)}`,
	).join("");
	const first = passages(text, { search: "needle" });
	assert(first.nextOffset !== null);
	expect(first.passages.length).toBeGreaterThan(0);
	const next = passages(text, { search: "needle", offset: first.nextOffset });
	expect(next.passages.length).toBeGreaterThan(0);
	for (const output of [first, next]) {
		expect(JSON.stringify(output).length).toBeLessThanOrEqual(
			FILE_RESULT_CHARS,
		);
		expect(
			output.passages.every((found) => found.text.includes("needle")),
		).toBe(true);
	}
});
