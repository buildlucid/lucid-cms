import { randomUUID } from "node:crypto";
import { afterAll, assert, beforeAll, expect, test } from "vitest";
import defineAgent from "../../../libs/agent/define-agent.js";
import applyCollectionMigrations from "../../../libs/collection/apply-collection-migrations.js";
import CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import planCollectionMigrations from "../../../libs/collection/plan-collection-migrations.js";
import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import { ExternalScopes } from "../../../libs/permission/external-scopes.js";
import createToolkit from "../../../libs/toolkit/create-toolkit.js";
import type { ToolkitActor } from "../../../libs/toolkit/types.js";
import { executeAgentTool } from "../../../libs/tools/execute-tool.js";
import { agentTools, mcpTools } from "../../../libs/tools/lucid-tools.js";
import { toolDefinitionInternal } from "../../../libs/tools/tool-definition-internal.js";
import type { AgentToolDefinition } from "../../../libs/tools/types.js";
import type { LucidUser } from "../../../types/hono.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import deleteConversation from "../../agent/delete-conversation.js";
import insertConversation from "../../agent/helpers/insert-conversation.js";
import list from "../../agent/references/list.js";
import publish from "../../documents/publish.js";
import syncCollections from "../../sync/sync-collections.js";
import syncLocales from "../../sync/sync-locales.js";
import { outputSchema as getOutputSchema } from "./get/schema.js";

const fixture = getTestConfig();
const collection = (key: string) =>
	new CollectionBuilder(key, {
		mode: "multiple",
		details: { labels: { singular: "Page", plural: "Pages" } },
		publishing: { targets: [{ key: "production", label: "Production" }] },
	}).addText("title", { useAsLabel: true });
const pages = collection("request_tool_pages");
const posts = collection("request_tool_posts");
const reviewer = defineAgent({
	key: "reviewer",
	name: "Reviewer",
	description: "Reviews requests.",
});
const editor = defineAgent({
	key: "editor",
	name: "Editor",
	description: "Edits pages.",
});

let context: ServiceContext;
let user: LucidUser;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: {
			...config,
			collections: [pages, posts],
			ai: { ...config.ai, agents: { definitions: [reviewer, editor] } },
		},
		database: await fixture.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: { en: { admin: {}, server: {} } },
		}),
	});
	await fixture.migrate();
	expect((await syncLocales(context)).error).toBeUndefined();
	expect((await syncCollections(context)).error).toBeUndefined();
	const plan = await planCollectionMigrations(context);
	assert(plan.data, JSON.stringify(plan.error));
	expect(
		(await applyCollectionMigrations(context, plan.data)).error,
	).toBeUndefined();

	user = await insertUser(true);
});
afterAll(() => fixture.destroy());

const insertUser = async (superAdmin: boolean): Promise<LucidUser> => {
	const inserted = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${randomUUID()}@example.test`,
			username: randomUUID(),
			first_name: "Will",
			secret: "test",
			super_admin: superAdmin,
		})
		.returning(["id", "email", "username"])
		.executeTakeFirstOrThrow();
	return { ...inserted, superAdmin, permissions: [] };
};

/** Starts a chat with a run of the agent, acting for a person (the super admin by default) or the system. */
const startRun = async (
	agentKey = reviewer.key,
	runUser: LucidUser | null = user,
) => {
	const userId = runUser?.id ?? null;
	const conversation = await insertConversation(context, {
		agentKey,
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
			agent_key: agentKey,
			system: userId === null,
			conversation_id: conversation.data.id,
		})
		.execute();

	const actor: ToolkitActor =
		userId === null
			? { kind: "system", agentRunId: runId }
			: { kind: "user", userId, agentRunId: runId };
	const execute = (tool: AgentToolDefinition, input: unknown) =>
		executeAgentTool({
			context,
			tool,
			input,
			execution: {
				authority: {
					principal:
						userId === null ? { type: "system" } : { type: "user", userId },
					permissions: [],
					superAdmin: true,
				},
				actor,
				signal: AbortSignal.timeout(10_000),
				operationId: `${runId}:${randomUUID()}`,
				run: {
					id: runId,
					conversationId: conversation.data.id,
					userId,
					agentKey,
				},
			},
		});

	return {
		runId,
		conversationId: conversation.data.id,
		call: async (tool: AgentToolDefinition, input: unknown) => {
			const result = await execute(tool, input);
			assert(result.type === "success", JSON.stringify(result));
			return result.data.output;
		},
		fail: async (tool: AgentToolDefinition, input: unknown) => {
			const result = await execute(tool, input);
			assert(result.type === "failed", JSON.stringify(result));
			return result.message;
		},
	};
};

const getRequest = agentTools.getRequest();
const [commentOnRequest, replyToRequest, updateComment, acknowledgeRequest] =
	agentTools.reviewing();
assert(
	commentOnRequest && replyToRequest && updateComment && acknowledgeRequest,
);

const readRequest = async (
	run: Awaited<ReturnType<typeof startRun>>,
	requestId: number,
) => getOutputSchema.parse(await run.call(getRequest, { requestId })).data;

const createDocument = async (collectionKey = pages.key) => {
	const created = await createToolkit(context).documents.createSingle({
		collectionKey,
		actor: { kind: "system" },
		data: { fields: { title: "Hello" } },
	});
	assert(created.data, JSON.stringify(created.error));
	return created.data.id;
};

const createRequest = async (collectionKey = pages.key) => {
	const created = await createToolkit(context).requests.createSingle({
		actor: { kind: "user", userId: user.id },
		type: "publish",
		title: "Launch",
		description: "<p>Ready for review</p>",
		documents: [
			{
				collectionKey,
				documentId: await createDocument(collectionKey),
				source: "latest",
				targets: ["production"],
			},
		],
	});
	assert(created.data, JSON.stringify(created.error));
	return created.data.id;
};

test("finds and reads requests only within the tool's collections", async () => {
	const pageRequest = await createRequest();
	const postRequest = await createRequest(posts.key);
	const run = await startRun();

	const closedRequest = await createRequest();
	expect(
		(
			await createToolkit(context).requests.close({
				id: closedRequest,
				actor: { kind: "system" },
			})
		).error,
	).toBeUndefined();
	const find = async (tool: AgentToolDefinition, input: unknown) =>
		((await run.call(tool, input)) as { data: { id: number }[] }).data.map(
			(request) => request.id,
		);

	//* without a query it lists open requests, most recently changed first
	expect(await run.call(agentTools.findRequests(), {})).toMatchObject({
		pagination: { page: 1, perPage: 20 },
	});
	const open = await find(agentTools.findRequests(), {});
	expect(open.slice(0, 2)).toEqual([postRequest, pageRequest]);
	expect(open).not.toContain(closedRequest);
	expect(
		await find(agentTools.findRequests(), {
			query: {
				filter: [
					{ key: "status", value: ["open", "closed"], operator: "in" },
					{ key: "collectionKey", value: pages.key },
				],
			},
		}),
	).toEqual(expect.arrayContaining([closedRequest, pageRequest]));
	const pageOnly = await find(agentTools.findRequests(), {
		query: { filter: [{ key: "collectionKey", value: pages.key }] },
	});
	expect(pageOnly).toContain(pageRequest);
	expect(pageOnly).not.toContain(closedRequest);
	expect(pageOnly).not.toContain(postRequest);
	const limited = await find(
		agentTools.findRequests({ collections: [pages.key] }),
		{ query: { perPage: 50 } },
	);
	expect(limited).toContain(pageRequest);
	expect(limited).not.toContain(postRequest);
	await run.fail(agentTools.getRequest({ collections: [pages.key] }), {
		requestId: postRequest,
	});

	const request = await readRequest(run, pageRequest);
	expect(request).toMatchObject({
		title: "Launch",
		description: "<p>Ready for review</p>",
		createdBy: { id: user.id, name: "Will" },
		documents: [
			{
				collectionKey: pages.key,
				source: "latest",
				targets: [{ target: "production", changedByOthers: false }],
			},
		],
		permissions: { edit: true, complete: true },
	});
	expect(request.reviewToken).toEqual(expect.any(String));
});

test("MCP reads only reach collections the connection can read", async () => {
	const pageRequest = await createRequest();
	const postRequest = await createRequest(posts.key);
	const [, mcpGetRequest] = mcpTools.requests();
	assert(mcpGetRequest);

	const read = async (requestId: number) => {
		const prepared = await mcpGetRequest[toolDefinitionInternal].prepareInput({
			requestId,
		});
		assert(prepared.type === "ready");
		return prepared.data.run({
			context,
			execution: {
				authority: {
					principal: { type: "system" },
					scopes: [
						ExternalScopes.RequestsRead,
						ExternalScopes.DocumentRead(pages.key),
					],
				},
				signal: AbortSignal.timeout(10_000),
			},
		});
	};

	const page = await read(pageRequest);
	assert(page.type === "success", JSON.stringify(page));
	expect(page.data.output).toMatchObject({ data: { id: pageRequest } });
	expect(page.data.output).not.toHaveProperty("data.reviewToken");
	expect((await read(postRequest)).type).toBe("failed");
});

test("agents comment and reply as their run and only change comments their agent wrote", async () => {
	const requestId = await createRequest();
	const run = await startRun();
	const commented = (await run.call(commentOnRequest, {
		requestId,
		body: "<p>The title needs work</p>",
	})) as { comment: { id: number } };
	const person = await createToolkit(context).requests.comments.create({
		id: requestId,
		actor: { kind: "user", userId: user.id },
		body: "<p>Agreed</p>",
	});
	assert(person.data, JSON.stringify(person.error));
	expect(
		await run.fail(replyToRequest, {
			requestId,
			replyTo: 999_999,
			body: "<p>Done</p>",
		}),
	).toContain("requests_comment");
	await run.call(replyToRequest, {
		requestId,
		replyTo: person.data.id,
		body: "<p>Thanks</p>",
	});

	const event = await context.db.kysely
		.selectFrom("lucid_request_events")
		.select(["user_id", "agent_run_id"])
		.where("id", "=", commented.comment.id)
		.executeTakeFirstOrThrow();
	expect(event).toEqual({ user_id: user.id, agent_run_id: run.runId });
	expect(
		(await readRequest(run, requestId)).comments.map((comment) => ({
			body: comment.body,
			byYou: comment.byYou,
		})),
	).toEqual([
		{ body: "<p>The title needs work</p>", byYou: true },
		{ body: "<p>Agreed</p>", byYou: false },
	]);
	expect((await readRequest(run, requestId)).comments[1]?.replies).toEqual([
		expect.objectContaining({ body: "<p>Thanks</p>", byYou: true }),
	]);
	expect(
		(
			await list(context, {
				conversationId: run.conversationId,
				userId: user.id,
			})
		).data,
	).toEqual([expect.objectContaining({ type: "request", requestId })]);

	//* a later chat with the same agent can still manage its comment, other agents can't
	const later = await startRun();
	await later.fail(updateComment, {
		requestId,
		commentId: person.data.id,
		action: "resolve",
	});
	await (await startRun(editor.key)).fail(updateComment, {
		requestId,
		commentId: commented.comment.id,
		action: "remove",
	});
	await later.call(updateComment, {
		requestId,
		commentId: commented.comment.id,
		action: "resolve",
		body: "<p>Ignored unless editing</p>",
	});
	expect((await readRequest(later, requestId)).comments[0]).toMatchObject({
		body: "<p>The title needs work</p>",
		resolution: "resolved",
	});
	await later.call(updateComment, {
		requestId,
		commentId: commented.comment.id,
		action: "remove",
	});
	expect(
		(await readRequest(later, requestId)).comments.map((comment) => comment.id),
	).toEqual([person.data.id]);
});

test("an agent's comments stay the agent's, even after its chat is deleted", async () => {
	const requestId = await createRequest();
	const run = await startRun();
	const commented = (await run.call(commentOnRequest, {
		requestId,
		body: "<p>Check the hero image</p>",
	})) as { comment: { id: number } };
	const toolkit = createToolkit(context);

	//* the person the agent acted for can resolve it like anyone's, but not rewrite it
	expect(
		(
			await toolkit.requests.comments.update({
				id: requestId,
				commentId: commented.comment.id,
				actor: { kind: "user", userId: user.id },
				body: "<p>Rewritten</p>",
			})
		).error?.status,
	).toBe(404);
	expect(
		(
			await toolkit.requests.comments.resolve({
				id: requestId,
				commentId: commented.comment.id,
				actor: { kind: "user", userId: user.id },
				resolution: "resolved",
			})
		).error,
	).toBeUndefined();

	expect(
		(
			await deleteConversation(context, {
				id: run.conversationId,
				userId: user.id,
			})
		).error,
	).toBeUndefined();
	const request = await toolkit.requests.getSingle({ id: requestId });
	assert(request.data, JSON.stringify(request.error));
	expect(
		request.data.events.find((event) => event.id === commented.comment.id),
	).toMatchObject({
		user: { id: user.id },
		agent: { key: reviewer.key, name: "Reviewer", conversationId: null },
		resolvedByAgent: null,
	});
	await (await startRun()).call(updateComment, {
		requestId,
		commentId: commented.comment.id,
		action: "reopen",
	});
});

test("the system's agent never takes over comments it wrote for a person who was deleted", async () => {
	const requestId = await createRequest();
	const author = await insertUser(true);
	const forAuthor = await startRun(reviewer.key, author);
	const commented = (await forAuthor.call(commentOnRequest, {
		requestId,
		body: "<p>Written for a person</p>",
	})) as { comment: { id: number } };

	//* deleting a person clears their ID from what they did
	await context.db.kysely
		.deleteFrom("lucid_users")
		.where("id", "=", author.id)
		.execute();
	const system = await startRun(reviewer.key, null);
	expect(
		await system.fail(updateComment, {
			requestId,
			commentId: commented.comment.id,
			action: "edit",
			body: "<p>Taken over</p>",
		}),
	).toContain("wasn't written by you");
	const [comment] = (await readRequest(system, requestId)).comments;
	expect(comment).toMatchObject({ author: null, byYou: false });
	const request = await createToolkit(context).requests.getSingle({
		id: requestId,
	});
	expect(
		request.data?.events.find((event) => event.id === commented.comment.id),
	).toMatchObject({ user: null, agent: { key: reviewer.key, system: false } });
});

test("people hear about what an agent does for them, including mentions", async () => {
	const requestId = await createRequest();
	const run = await startRun();
	await run.call(commentOnRequest, {
		requestId,
		body: `<p><span data-lucid-mention data-lucid-user-id="${user.id}"></span> please check the title</p>`,
	});

	const told = await context.db.kysely
		.selectFrom("lucid_notifications")
		.innerJoin(
			"lucid_notification_recipients",
			"lucid_notification_recipients.notification_id",
			"lucid_notifications.id",
		)
		.select([
			"lucid_notifications.actor_user_id",
			"lucid_notifications.actor_run_id",
		])
		.where("lucid_notifications.type", "=", "requests:mentioned")
		.where("lucid_notification_recipients.user_id", "=", user.id)
		.where("lucid_notifications.actor_run_id", "=", run.runId)
		.execute();
	expect(told).toEqual([{ actor_user_id: user.id, actor_run_id: run.runId }]);
});

test("acknowledges targets someone else published to, as they were read", async () => {
	const requestId = await createRequest();
	const run = await startRun();
	const [document] = (await readRequest(run, requestId)).documents;
	assert(document);
	expect(
		(
			await publish(context, {
				collectionKey: pages.key,
				documentId: document.documentId,
				target: "production",
				user,
			})
		).error,
	).toBeUndefined();

	const changed = await readRequest(run, requestId);
	expect(changed.blockers).toContainEqual(
		expect.objectContaining({ code: "review_required", target: "production" }),
	);
	await run.fail(acknowledgeRequest, { requestId, reviewToken: "stale" });

	expect(
		await run.call(acknowledgeRequest, {
			requestId,
			reviewToken: changed.reviewToken,
		}),
	).toMatchObject({
		acknowledged: [
			{
				collectionKey: pages.key,
				documentId: document.documentId,
				target: "production",
			},
		],
	});
	const acknowledged = await readRequest(run, requestId);
	expect(acknowledged.documents[0]?.targets[0]).toMatchObject({
		changedByOthers: true,
		acknowledged: true,
	});
	expect(acknowledged.blockers).not.toContainEqual(
		expect.objectContaining({ code: "review_required" }),
	);
});

test("updates details, documents and status together", async () => {
	const requestId = await createRequest();
	const run = await startRun();
	const [original] = (await readRequest(run, requestId)).documents;
	assert(original);
	const added = await createDocument();

	await run.call(agentTools.updateRequest(), {
		requestId,
		changes: [
			{ type: "status", status: "closed" },
			{
				type: "removeDocument",
				collectionKey: pages.key,
				documentId: original.documentId,
			},
			{ type: "title", title: "Renamed" },
			{ type: "description", description: "<p>Why it matters</p>" },
			{
				type: "addDocument",
				collectionKey: pages.key,
				documentId: added,
				targets: ["production"],
			},
		],
	});
	const updated = await createToolkit(context).requests.getSingle({
		id: requestId,
	});
	assert(updated.data, JSON.stringify(updated.error));
	expect(updated.data).toMatchObject({
		title: "Renamed",
		status: "closed",
		documents: [{ documentId: added, source: "latest" }],
	});
	expect(
		updated.data.events.find((event) => event.type === "document_added"),
	).toMatchObject({
		agent: {
			key: reviewer.key,
			name: "Reviewer",
			conversationId: run.conversationId,
		},
	});

	await run.call(agentTools.updateRequest(), {
		requestId,
		changes: [{ type: "status", status: "open" }],
	});
	expect((await readRequest(run, requestId)).status).toBe("open");
});

test("schedules completion but can't complete requests that aren't approved", async () => {
	const requestId = await createRequest();
	const run = await startRun();
	const complete = agentTools.completeRequest();
	const schedule = agentTools.scheduleRequest();
	expect(complete.requiresApproval).toBe(true);
	expect(schedule.requiresApproval).toBe(true);

	await run.call(schedule, { requestId, at: "2030-01-01T09:00:00.000Z" });
	expect((await readRequest(run, requestId)).scheduledAt).toBe(
		"2030-01-01T09:00:00.000Z",
	);
	await run.call(schedule, { requestId, at: null });
	expect((await readRequest(run, requestId)).scheduledAt).toBeNull();
	await run.fail(complete, { requestId });
});

/** Writes that commit their own transaction, like tools and the toolkit, run queued jobs straight away. */
const jobStatus = async (jobId: string) =>
	(
		await context.db.kysely
			.selectFrom("lucid_jobs")
			.select("status")
			.where("job_id", "=", jobId)
			.executeTakeFirstOrThrow()
	).status;

/** Approves a request as the super admin, as it currently reads. */
const approveRequest = async (requestId: number) => {
	const request = await createToolkit(context).requests.getSingle({
		id: requestId,
	});
	assert(request.data, JSON.stringify(request.error));
	const approved = await createToolkit(context).requests.approve({
		id: requestId,
		actor: { kind: "user", userId: user.id },
		ifUnchanged: request.data.reviewToken,
	});
	assert(!approved.error, JSON.stringify(approved.error));
};

test("the toolkit approves as a person, only what they reviewed, and withdraws it", async () => {
	const toolkit = createToolkit(context);
	const run = await startRun();
	const requestId = await createRequest();
	const read = async () => {
		const request = await toolkit.requests.getSingle({ id: requestId });
		assert(request.data, JSON.stringify(request.error));
		return request.data;
	};
	const { reviewToken } = await read();
	const actor = {
		kind: "user",
		userId: user.id,
		agentRunId: run.runId,
	} as const;

	expect(
		(
			await toolkit.requests.approve({
				id: requestId,
				actor,
				ifUnchanged: "stale",
			})
		).error?.status,
	).toBe(409);
	expect(
		(
			await toolkit.requests.approve({
				id: requestId,
				// @ts-expect-error approvals belong to people
				actor: { kind: "system" },
				ifUnchanged: reviewToken,
			})
		).error,
	).toBeDefined();

	const approved = await toolkit.requests.approve({
		id: requestId,
		actor,
		ifUnchanged: reviewToken,
		body: "<p>Checked the links.</p>",
	});
	assert(!approved.error, JSON.stringify(approved.error));
	const afterApproval = await read();
	expect(afterApproval.approved).toBe(true);
	expect(
		afterApproval.events.find((event) => event.type === "approved"),
	).toMatchObject({ user: { id: user.id }, agent: { key: reviewer.key } });
	//* agents see the agent behind activity, as they do for comments
	expect(
		getOutputSchema.parse(
			await run.call(getRequest, { requestId, include: ["activity"] }),
		).data.activity,
	).toContainEqual(
		expect.objectContaining({
			type: "approved",
			author: { id: user.id, name: "Will" },
			agent: reviewer.name,
		}),
	);

	const withdrawn = await toolkit.requests.unapprove({ id: requestId, actor });
	assert(!withdrawn.error, JSON.stringify(withdrawn.error));
	const afterWithdrawal = await read();
	expect(afterWithdrawal.approved).toBe(false);
	expect(
		afterWithdrawal.events.find((event) => event.type === "approval_dismissed"),
	).toMatchObject({ user: { id: user.id }, agent: { key: reviewer.key } });
});

test("agents and the system complete requests", async () => {
	const toolkit = createToolkit(context);
	const run = await startRun();

	//* an agent's completion is attributed to it all the way through the job
	const byAgent = await createRequest();
	await approveRequest(byAgent);
	const started = (await run.call(agentTools.completeRequest(), {
		requestId: byAgent,
	})) as { job: { id: string } };
	expect(await jobStatus(started.job.id)).toBe("completed");
	const completed = await toolkit.requests.getSingle({ id: byAgent });
	assert(completed.data, JSON.stringify(completed.error));
	expect(completed.data.status).toBe("completed");
	expect(
		completed.data.events.find((event) => event.type === "completed"),
	).toMatchObject({ user: { id: user.id }, agent: { key: reviewer.key } });
	const tables = await getTableNames(context, pages.key);
	assert(tables.data);
	expect(
		await context.db.kysely
			.selectFrom(tables.data.version)
			.select(["created_by", "created_by_run_id"])
			.where("document_id", "=", completed.data.documents[0]?.documentId ?? 0)
			.where("type", "=", "production")
			.executeTakeFirst(),
	).toEqual({ created_by: user.id, created_by_run_id: run.runId });
	expect(
		await run.fail(agentTools.updateRequest(), {
			requestId: byAgent,
			changes: [{ type: "status", status: "open" }],
		}),
	).toContain("completed");

	const bySystem = await createRequest();
	await approveRequest(bySystem);
	const queued = await toolkit.requests.complete({
		id: bySystem,
		actor: { kind: "system" },
	});
	assert(queued.data, JSON.stringify(queued.error));
	expect(await jobStatus(queued.data.jobId)).toBe("completed");
	expect(
		(await toolkit.requests.getSingle({ id: bySystem })).data?.status,
	).toBe("completed");
});

test("toolkit reads and writes use the actor's live permissions", async () => {
	const requestId = await createRequest();
	const outsider = await insertUser(false);
	const toolkit = createToolkit(context);

	const listed = await toolkit.requests.getMultiple({
		actor: { kind: "user", userId: outsider.id },
	});
	expect(listed.data?.count).toBe(0);
	expect(
		(
			await toolkit.requests.getSingle({
				id: requestId,
				actor: { kind: "user", userId: outsider.id },
			})
		).error?.status,
	).toBe(404);
	expect(
		(
			await toolkit.requests.comments.create({
				id: requestId,
				actor: { kind: "user", userId: outsider.id },
				body: "<p>Hello</p>",
			})
		).error?.status,
	).toBe(404);

	const system = await toolkit.requests.getSingle({ id: requestId });
	expect(system.data?.id).toBe(requestId);
});
