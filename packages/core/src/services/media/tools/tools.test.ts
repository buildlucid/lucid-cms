import { randomUUID } from "node:crypto";
import { afterAll, assert, beforeAll, expect, test } from "vitest";
import defineAgent from "../../../libs/agent/define-agent.js";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import { ExternalScopes } from "../../../libs/permission/external-scopes.js";
import {
	executeAgentTool,
	executeMcpTool,
	prepareAgentTool,
} from "../../../libs/tools/execute-tool.js";
import { agentTools, mcpTools } from "../../../libs/tools/lucid-tools.js";
import { toolDefinitionInternal } from "../../../libs/tools/registry.js";
import type {
	AgentToolDefinition,
	AgentToolExecution,
} from "../../../libs/tools/types.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import insertConversation from "../../agent/helpers/insert-conversation.js";
import syncLocales from "../../sync/sync-locales.js";
import { outputSchema as getOutputSchema } from "./get/schema.js";
import { outputSchema as selectOutputSchema } from "./select/schema.js";

const fixture = getTestConfig();
const agent = defineAgent({
	key: "librarian",
	name: "Librarian",
	description: "Looks after media.",
});

let context: ServiceContext;
let owner: number;
let other: number;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: {
			...config,
			localization: {
				defaultLocale: "en",
				locales: [
					{ code: "en", label: "English" },
					{ code: "fr", label: "French" },
				],
			},
			ai: {
				...config.ai,
				features: { ...config.ai.features, mcp: true },
				mcp: { tools: [mcpTools.getMedia()], skills: [] },
				agents: { definitions: [agent] },
			},
		},
		database: await fixture.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: { en: { admin: {}, server: {} } },
		}),
	});
	await fixture.migrate();
	expect((await syncLocales(context)).error).toBeUndefined();

	owner = await insertUser();
	other = await insertUser();
});
afterAll(() => fixture.destroy());

const insertUser = async () => {
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${randomUUID()}@example.test`,
			username: randomUUID(),
			secret: "test",
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	return user.id;
};

const insertMedia = async (
	values: { type?: "image" | "document"; ownerUserId?: number } = {},
) => {
	const document = values.type === "document";
	const media = await context.db.kysely
		.insertInto("lucid_media")
		.values({
			key: randomUUID(),
			storage_adapter_key: "test",
			origin: "human",
			type: values.type ?? "image",
			mime_type: document ? "application/pdf" : "image/png",
			file_extension: document ? "pdf" : "png",
			file_name: document ? "guide.pdf" : "photo.png",
			file_size: 1,
			owner_user_id: values.ownerUserId ?? null,
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	return media.id;
};

/** Starts a chat with a run, as the runner would before calling tools. */
const startRun = async (userId: number | null) => {
	const conversation = await insertConversation(context, {
		agentKey: agent.key,
		userId,
	});
	assert(conversation.data, JSON.stringify(conversation.error));
	const runId = randomUUID();
	await context.db.kysely
		.insertInto("lucid_agent_runs")
		.values({
			id: runId,
			conversation_id: conversation.data.id,
			user_id: userId,
			status: "running",
		})
		.execute();
	await context.db.kysely
		.insertInto("lucid_agent_attributions")
		.values({
			run_id: runId,
			agent_key: agent.key,
			system: userId === null,
			conversation_id: conversation.data.id,
		})
		.execute();

	const execution: AgentToolExecution = {
		authority: {
			principal:
				userId === null ? { type: "system" } : { type: "user", userId },
			permissions: [Permissions.MediaRead, Permissions.MediaUpdate],
			superAdmin: false,
		},
		actor:
			userId === null
				? { kind: "system", agentRunId: runId }
				: { kind: "user", userId, agentRunId: runId },
		signal: AbortSignal.timeout(10_000),
		operationId: `${runId}:${randomUUID()}`,
		run: {
			id: runId,
			conversationId: conversation.data.id,
			userId,
			agentKey: agent.key,
		},
	};

	return {
		runId,
		conversationId: conversation.data.id,
		execution,
		call: (
			tool: AgentToolDefinition,
			input: unknown,
			interaction?: AgentToolExecution["interaction"],
		) =>
			executeAgentTool({
				context,
				tool,
				input,
				execution: { ...execution, interaction },
			}),
	};
};

const references = (conversationId: string) =>
	context.db.kysely
		.selectFrom("lucid_agent_media_references")
		.select(["media_id", "managed"])
		.where("conversation_id", "=", conversationId)
		.orderBy("media_id")
		.execute();

test("media_get reads library media over MCP and the run owner's personal media for agents", async () => {
	const library = await insertMedia();
	const personal = await insertMedia({ ownerUserId: owner });
	const othersPersonal = await insertMedia({ ownerUserId: other });
	const mcp = (mediaId: number) =>
		executeMcpTool({
			context,
			name: "media_get",
			input: { mediaId },
			execution: {
				authority: {
					principal: { type: "user", userId: owner },
					scopes: [ExternalScopes.McpAccess, ExternalScopes.MediaRead],
				},
				signal: AbortSignal.timeout(10_000),
			},
		});

	expect((await mcp(library)).type).toBe("success");
	expect((await mcp(personal)).type).toBe("failed");

	const run = await startRun(owner);
	const read = await run.call(agentTools.getMedia(), { mediaId: personal });
	assert(read.type === "success", JSON.stringify(read));
	expect(getOutputSchema.parse(read.data.output).data).toMatchObject({
		id: personal,
		personal: true,
		fileName: "photo.png",
		folderId: null,
	});
	expect(
		(await run.call(agentTools.getMedia(), { mediaId: othersPersonal })).type,
	).toBe("failed");
});

test("media_update changes one locale, records the run and links the media as a managed reference", async () => {
	const mediaId = await insertMedia({ type: "document" });
	const run = await startRun(owner);

	const updated = await run.call(agentTools.updateMedia(), {
		mediaId,
		contentLocale: "fr",
		title: "Guide",
		summary: "Un guide",
	});
	assert(updated.type === "success", JSON.stringify(updated));
	expect(getOutputSchema.parse(updated.data.output)).toMatchObject({
		data: { title: "Guide", description: "Un guide" },
		meta: { contentLocale: "fr" },
	});

	//* text left out keeps its value in that locale
	const summarised = await run.call(agentTools.updateMedia(), {
		mediaId,
		contentLocale: "fr",
		summary: "Un guide pratique",
	});
	assert(summarised.type === "success", JSON.stringify(summarised));
	expect(getOutputSchema.parse(summarised.data.output).data).toMatchObject({
		title: "Guide",
		description: "Un guide pratique",
	});

	const row = await context.db.kysely
		.selectFrom("lucid_media")
		.select(["updated_by", "updated_by_run_id"])
		.where("id", "=", mediaId)
		.executeTakeFirstOrThrow();
	expect(row).toEqual({ updated_by: owner, updated_by_run_id: run.runId });
	expect(await references(run.conversationId)).toEqual([
		{ media_id: mediaId, managed: expect.toSatisfy(Boolean) },
	]);
});

test("media_update refuses fields the media type lacks and folders for personal media", async () => {
	const document = await insertMedia({ type: "document" });
	const personal = await insertMedia({ ownerUserId: owner });
	const folder = await context.db.kysely
		.insertInto("lucid_media_folders")
		.values({ title: "Photos" })
		.returning("id")
		.executeTakeFirstOrThrow();
	const run = await startRun(owner);

	expect(
		(
			await run.call(agentTools.updateMedia(), {
				mediaId: document,
				alt: "A guide",
			})
		).type,
	).toBe("failed");
	expect(
		(
			await run.call(agentTools.updateMedia(), {
				mediaId: personal,
				folderId: folder.id,
			})
		).type,
	).toBe("failed");
	expect(
		(await run.call(agentTools.updateMedia(), { mediaId: personal })).type,
	).toBe("invalid-input");
	expect(await references(run.conversationId)).toEqual([]);
});

test("media_select offers personal media only to user runs, then checks and links the picked media", async () => {
	const tool = agentTools.selectMedia();
	const interaction = tool[toolDefinitionInternal].interaction;
	assert(interaction);
	const library = await insertMedia();
	const personal = await insertMedia({ ownerUserId: owner });
	const othersPersonal = await insertMedia({ ownerUserId: other });
	const document = await insertMedia({ type: "document" });
	const input = { message: "Pick photos", types: ["image"], max: 2 };

	const system = await startRun(null);
	const systemPrepared = await prepareAgentTool({
		context,
		tool,
		input,
		execution: system.execution,
	});
	assert(systemPrepared.type === "success", JSON.stringify(systemPrepared));
	expect(systemPrepared.data).toMatchObject({
		interaction: { data: { includePersonal: false, upload: false } },
	});

	const run = await startRun(owner);
	const prepared = await prepareAgentTool({
		context,
		tool,
		input,
		execution: run.execution,
	});
	assert(prepared.type === "success", JSON.stringify(prepared));
	assert("interaction" in prepared.data);
	const { data } = prepared.data.interaction;
	expect(data).toEqual({
		types: ["image"],
		max: 2,
		agentKey: agent.key,
		includePersonal: true,
		upload: true,
	});

	expect(
		(await interaction.parseResponse(data, { mediaIds: [1, 2, 3] })).error,
	).toBeDefined();
	expect(
		(await interaction.parseResponse(data, { mediaIds: [1, 1] })).error,
	).toBeDefined();

	for (const mediaIds of [[library, document], [othersPersonal]]) {
		const refused = await run.call(tool, input, {
			data,
			response: { mediaIds },
		});
		expect(refused.type).toBe("failed");
	}
	expect(await references(run.conversationId)).toEqual([]);

	const picked = await run.call(tool, input, {
		data,
		response: { mediaIds: [personal, library] },
	});
	assert(picked.type === "success", JSON.stringify(picked));
	expect(
		selectOutputSchema.parse(picked.data.output).data.map((media) => media.id),
	).toEqual([personal, library]);
	expect(await references(run.conversationId)).toEqual([
		{ media_id: library, managed: expect.toSatisfy((value) => !value) },
		{ media_id: personal, managed: expect.toSatisfy((value) => !value) },
	]);
});
