import { randomUUID } from "node:crypto";
import { afterAll, assert, beforeAll, expect, test } from "vitest";
import applyCollectionMigrations from "../../libs/collection/apply-collection-migrations.js";
import CollectionBuilder from "../../libs/collection/builders/collection-builder/index.js";
import planCollectionMigrations from "../../libs/collection/plan-collection-migrations.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import { consumeJob } from "../../libs/jobs/consume/index.js";
import { recoverExpiredJobs } from "../../libs/jobs/maintenance.js";
import { getJobDefinitionRuntime } from "../../libs/jobs/registry.js";
import { getCollectionPermission } from "../../libs/permission/collection-permissions.js";
import { Permissions } from "../../libs/permission/definitions.js";
import { RequestsRepository } from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { RequestDetail } from "../../types/response.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import type { ServiceContext } from "../../utils/services/types.js";
import { createTestQueueAdapter } from "../../utils/test-helpers/create-jobs-context.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import getWorkflow from "../document-workflows/get-single.js";
import updateWorkflow from "../document-workflows/update-single.js";
import getDocuments from "../documents/get-multiple.js";
import getDocument from "../documents/get-single.js";
import upsertSingle from "../documents/upsert-single.js";
import align from "../documents-versions/align.js";
import readVersionContent from "../documents-versions/helpers/read-version-content.js";
import updateVersion from "../documents-versions/update-single.js";
import syncCollections from "../sync/sync-collections.js";
import addDocuments from "./add-documents.js";
import approve from "./approve.js";
import close from "./close.js";
import complete from "./complete.js";
import createComment from "./create-comment.js";
import createSingle from "./create-single.js";
import deleteComment from "./delete-comment.js";
import execute from "./execute.js";
import getExecution from "./get-execution.js";
import getMultiple from "./get-multiple.js";
import getOverview from "./get-overview.js";
import getSingle from "./get-single.js";
import RequestExecutionError from "./helpers/execution-error.js";
import scheduleRequest from "./helpers/schedule-request.js";
import { executeRequestJob } from "./jobs/execute.js";
import removeDocument from "./remove-document.js";
import reopen from "./reopen.js";
import requestCreation from "./request-creation.js";
import reviewTarget from "./review-target.js";
import unapprove from "./unapprove.js";
import updateCommentResolution from "./update-comment-resolution.js";
import updateSingle from "./update-single.js";
import updateTargets from "./update-targets.js";

const fixture = getTestConfig();
const collections = [
	...["request_pages", "request_articles"].map((key) =>
		new CollectionBuilder(key, {
			mode: "multiple",
			revisions: { enabled: true },
			details: { labels: { singular: "Page", plural: "Pages" } },
			publishing: {
				scheduling: true,
				review: { targets: ["production"], selfApproval: false },
				targets: [
					{ key: "staging", label: "Staging" },
					{ key: "production", label: "Production", requires: ["staging"] },
				],
			},
		})
			.addText("title", { validation: { required: true } })
			.addText("summary"),
	),
	new CollectionBuilder("workflow_pages", {
		details: { labels: { singular: "Page", plural: "Pages" } },
		mode: "multiple",
		revisions: true,
		publishing: {
			targets: [
				{ key: "staging", label: "Staging" },
				{ key: "production", label: "Production", requires: ["staging"] },
			],
			workflow: {
				initial: "draft",
				stages: [
					{ key: "draft", label: "Draft" },
					{
						key: "ready",
						label: "Ready",
						targets: ["staging", "production"],
					},
				],
			},
		},
	})
		.addText("title")
		.addText("summary"),
	new CollectionBuilder("create_request_pages", {
		details: { labels: { singular: "Page", plural: "Pages" } },
		mode: "multiple",
		revisions: true,
		publishing: {
			review: { create: true },
			targets: [{ key: "staging", label: "Staging" }],
			workflow: {
				initial: "draft",
				stages: [
					{ key: "draft", label: "Draft" },
					{ key: "ready", label: "Ready", targets: ["latest", "staging"] },
				],
			},
		},
	})
		.addText("title", { validation: { required: true } })
		.addText("summary")
		.addRelation("related", { collection: "create_request_pages" }),
	new CollectionBuilder("approval_pages", {
		details: { labels: { singular: "Page", plural: "Pages" } },
		mode: "multiple",
		publishing: {
			review: { targets: ["staging"], approvals: 2 },
			targets: [{ key: "staging", label: "Staging" }],
		},
	})
		.addText("title")
		.addText("summary"),
	new CollectionBuilder("reset_pages", {
		details: { labels: { singular: "Page", plural: "Pages" } },
		mode: "multiple",
		publishing: {
			targets: [{ key: "staging", label: "Staging" }],
			workflow: {
				initial: "draft",
				stages: [
					{ key: "draft", label: "Draft" },
					{ key: "review", label: "Review" },
					{
						key: "ready",
						label: "Ready",
						targets: ["staging"],
						resetTo: "review",
					},
				],
			},
		},
	})
		.addText("title")
		.addText("summary"),
	new CollectionBuilder("checked_pages", {
		details: { labels: { singular: "Page", plural: "Pages" } },
		mode: "multiple",
		publishing: { targets: [{ key: "staging", label: "Staging" }] },
		hooks: [
			{
				service: "requests",
				event: "check",
				handler: async ({ data }) => {
					for (const document of data.documents) {
						data.blockers.push({
							requestDocumentId: document.requestDocumentId,
							message: `Checked ${document.collectionKey}`,
						});
					}
					return { error: undefined, data: undefined };
				},
			},
		],
	})
		.addText("title")
		.addText("summary"),
];
let context: ServiceContext;
let creator: LucidUser;
let reviewer: LucidUser;
let secondReviewer: LucidUser;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: {
			...config,
			collections,
			jobs: {
				...config.jobs,
				definitions: config.jobs.definitions.map((job) =>
					job.name === executeRequestJob.name ? executeRequestJob : job,
				),
			},
			email: { ...config.email, simulate: true },
		},
		database: await fixture.getDatabase(),
		queue: createTestQueueAdapter(async () => ({
			error: undefined,
			data: undefined,
		})),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: { en: { admin: {}, server: {} } },
		}),
	});
	await fixture.migrate();
	expect((await syncCollections(context)).error).toBeUndefined();
	const plan = await planCollectionMigrations(context);
	assert(plan.data, JSON.stringify(plan.error));
	expect(
		(await applyCollectionMigrations(context, plan.data)).error,
	).toBeUndefined();

	const createUser = async (): Promise<LucidUser> => {
		const user = await context.db.kysely
			.insertInto("lucid_users")
			.values({
				email: `${randomUUID()}@example.test`,
				username: randomUUID(),
				secret: "test",
				super_admin: true,
			})
			.returning(["id", "email", "username"])
			.executeTakeFirstOrThrow();
		return { ...user, superAdmin: true, permissions: [] };
	};
	creator = await createUser();
	reviewer = await createUser();
	secondReviewer = await createUser();
});
afterAll(async () => {
	await fixture.destroy();
});

const createDocument = async (
	key = "request_pages",
	title = "Source",
	summary = "Original",
) => {
	const written = await upsertSingle(context, {
		collectionKey: key,
		userId: creator.id,
		fields: [
			{ key: "title", type: "text", value: title },
			{ key: "summary", type: "text", value: summary },
		],
	});
	assert(written.data, JSON.stringify(written.error));
	return written.data;
};
const editLatest = async (
	documentId: number,
	summary: string,
	key = "request_pages",
) => {
	const written = await upsertSingle(context, {
		collectionKey: key,
		documentId,
		userId: creator.id,
		fields: [
			{ key: "title", type: "text", value: "Source" },
			{ key: "summary", type: "text", value: summary },
		],
	});
	assert(written.data, JSON.stringify(written.error));
};
const readRequest = async (id: number) => {
	const read = await getSingle(context, { id, user: creator });
	assert(read.data, JSON.stringify(read.error));
	return read.data;
};
const member = (request: RequestDetail) => {
	const document = request.documents[0];
	assert(document);
	return document;
};
/** The request's own proposal or snapshot version. */
const versionOf = (request: RequestDetail) => {
	const versionId = member(request).versionId;
	assert(versionId);
	return versionId;
};
const createRequest = async (
	documentId: number,
	targets: string[] = ["staging"],
	source = "latest",
	collectionKey = "request_pages",
): Promise<RequestDetail> => {
	const created = await createSingle(context, {
		title: "Spring launch",
		documents: [{ collectionKey, documentId, source, targets }],
		user: creator,
	});
	assert(created.data, JSON.stringify(created.error));
	return readRequest(created.data.id);
};
const reviewInput = (request: RequestDetail) => ({
	id: request.id,
	revision: request.revision,
	expectedTargets: Object.fromEntries(
		request.documents.map((document) => [
			document.id,
			Object.fromEntries(
				document.targets.map((target) => [target.target, target.versionId]),
			),
		]),
	),
});
const approveRequest = async (id: number, user = reviewer) => {
	const approved = await approve(context, {
		...reviewInput(await readRequest(id)),
		user,
	});
	assert(!approved.error, JSON.stringify(approved.error));
	return readRequest(id);
};
const completeRequest = async (id: number, user = creator) => {
	const queued = await complete(context, { id, user });
	assert(queued.data, JSON.stringify(queued.error));
	expect(await consumeJob(context, queued.data)).toEqual({ type: "completed" });
	return readRequest(id);
};
const editProposal = async (
	request: RequestDetail,
	summary: string,
	title = "Source",
) => {
	const updated = await updateVersion(context, {
		collectionKey: member(request).collectionKey,
		documentId: member(request).documentId,
		versionId: versionOf(request),
		userId: creator.id,
		authUser: creator,
		fields: [
			{ key: "title", type: "text", value: title },
			{ key: "summary", type: "text", value: summary },
		],
	});
	assert(updated.data, JSON.stringify(updated.error));
	return readRequest(request.id);
};
const fieldOf = async (
	documentId: number,
	fieldKey: string,
	versionType: string,
	versionId?: number,
	collectionKey = "request_pages",
) => {
	const read = await readVersionContent(context, {
		collectionKey,
		documentId,
		versionType,
		versionId,
	});
	assert(!read.error, JSON.stringify(read.error));
	const field = read.data?.content.fields.find(
		(field) => field.key === fieldKey,
	);
	if (!field) return null;
	if (field.translations) return Object.values(field.translations)[0] ?? null;
	return field.value ?? null;
};

test("scheduled dispatch commits the request link before notifying a consumer", async () => {
	const request = await createRequest(await createDocument());
	await approveRequest(request.id);
	await context.db.kysely
		.updateTable("lucid_requests")
		.set({ scheduled_at: new Date().toISOString(), scheduled_by: creator.id })
		.where("id", "=", request.id)
		.execute();
	let deliveries = 0;
	const queue = createTestQueueAdapter(async (context, messages) => {
		for (const message of messages) {
			const linked = await context.db.kysely
				.selectFrom("lucid_requests")
				.select("execution_job_id")
				.where("id", "=", request.id)
				.executeTakeFirstOrThrow();
			expect(linked.execution_job_id).toBe(message.jobId);
			deliveries++;
		}
		return { error: undefined, data: undefined };
	});
	expect(
		(
			await serviceWrapper(scheduleRequest, { transaction: true })(
				{ ...context, queue },
				{ id: request.id },
			)
		).error,
	).toBeUndefined();
	expect(deliveries).toBe(1);
});

test("manual publication replaces a future schedule and its old delivery cannot publish", async () => {
	const documentId = await createDocument();
	const request = await createRequest(documentId);
	await approveRequest(request.id);
	const scheduled = await updateSingle(context, {
		id: request.id,
		user: creator,
		scheduledAt: new Date(Date.now() + 60_000).toISOString(),
		scheduledTimezone: "UTC",
	});
	assert(!scheduled.error, JSON.stringify(scheduled.error));
	const previous = (await readRequest(request.id)).executionJobId;
	assert(previous);
	const queued = await complete(context, {
		id: request.id,
		user: creator,
	});
	assert(queued.data);
	expect(queued.data.jobId).not.toBe(previous);
	await context.db.kysely
		.updateTable("lucid_jobs")
		.set({ available_at: new Date().toISOString() })
		.where("job_id", "=", previous)
		.execute();
	expect(await consumeJob(context, { jobId: previous })).toEqual({
		type: "completed",
	});
	expect(await fieldOf(documentId, "summary", "staging")).toBeNull();
	expect(await consumeJob(context, queued.data)).toEqual({ type: "completed" });
	expect(await fieldOf(documentId, "summary", "staging")).toBe("Original");
});

test("a failure hook can enrich polling's recovery without duplicate activity", async () => {
	const request = await createRequest(await createDocument(), [
		"staging",
		"production",
	]);
	const approved = await approveRequest(request.id);
	const queued = await complete(context, {
		id: request.id,
		user: creator,
	});
	assert(queued.data);
	await context.db.kysely
		.updateTable("lucid_jobs")
		.set({ status: "failed", error_message: "Production is frozen" })
		.where("job_id", "=", queued.data.jobId)
		.execute();
	expect(
		(await getExecution(context, { id: request.id, user: creator })).data
			?.status,
	).toBe("failed");
	expect((await readRequest(request.id)).failureRequestDocumentId).toBeNull();
	const hook = getJobDefinitionRuntime(executeRequestJob).onPermanentFailure;
	assert(hook);
	const failure = {
		jobId: queued.data.jobId,
		input: {
			requestId: request.id,
			revision: approved.revision,
			userId: creator.id,
		},
		attempts: 1,
		errorMessage: "Production is frozen",
		error: {
			cause: new RequestExecutionError(member(approved).id, "production"),
		},
	};
	await hook(context, failure);
	await hook(context, failure);
	const detail = await readRequest(request.id);
	expect(detail).toMatchObject({
		failureRequestDocumentId: member(approved).id,
		failureTarget: "production",
	});
	expect(detail.events.filter((event) => event.type === "failed")).toHaveLength(
		1,
	);
});

test("manual publication returns a reusable job receipt and commits with job completion", async () => {
	const documentId = await createDocument();
	const request = await createRequest(documentId);
	await approveRequest(request.id);
	const queued = await complete(context, {
		id: request.id,
		user: creator,
	});
	assert(queued.data, JSON.stringify(queued.error));
	expect(
		(await complete(context, { id: request.id, user: creator })).data,
	).toEqual(queued.data);
	expect(
		(await getExecution(context, { id: request.id, user: creator })).data,
	).toMatchObject({ jobId: queued.data.jobId, status: "queued" });
	expect((await readRequest(request.id)).status).toBe("open");
	expect(await fieldOf(documentId, "summary", "staging")).toBeNull();
	expect(await consumeJob(context, queued.data)).toEqual({ type: "completed" });
	expect(
		(await getExecution(context, { id: request.id, user: creator })).data
			?.status,
	).toBe("completed");
	expect(await fieldOf(documentId, "summary", "staging")).toBe("Original");
	expect((await readRequest(request.id)).executionJobId).toBe(
		queued.data.jobId,
	);
	expect(await consumeJob(context, queued.data)).toEqual({ type: "ignored" });
	expect(
		(await readRequest(request.id)).events.filter(
			(event) => event.type === "completed",
		),
	).toHaveLength(1);
});

test("editing a queued proposal invalidates its job and approval", async () => {
	const documentId = await createDocument();
	const request = await createRequest(documentId);
	await approveRequest(request.id);
	const queued = await complete(context, {
		id: request.id,
		user: creator,
	});
	assert(queued.data);
	const edited = await editProposal(request, "New proposal");
	expect(edited.executionJobId).toBeNull();
	expect(await consumeJob(context, queued.data)).toEqual({ type: "completed" });
	expect(
		(await getExecution(context, { id: request.id, user: creator })).data,
	).toBeNull();
	expect(await fieldOf(documentId, "summary", "staging")).toBeNull();
	expect((await readRequest(request.id)).approved).toBe(false);
});

test("queued publication rechecks whether its actor is still allowed to publish", async () => {
	const documentId = await createDocument();
	const request = await createRequest(documentId);
	await approveRequest(request.id);
	const queued = await complete(context, {
		id: request.id,
		user: creator,
	});
	assert(queued.data);
	await context.db.kysely
		.updateTable("lucid_users")
		.set({ is_locked: true })
		.where("id", "=", creator.id)
		.execute();
	try {
		expect(await consumeJob(context, queued.data)).toEqual({ type: "failed" });
		expect((await readRequest(request.id)).status).toBe("open");
		expect((await readRequest(request.id)).failure).not.toBeNull();
		expect(await fieldOf(documentId, "summary", "staging")).toBeNull();
	} finally {
		await context.db.kysely
			.updateTable("lucid_users")
			.set({ is_locked: false })
			.where("id", "=", creator.id)
			.execute();
	}
});

test("failed publication rolls back targets and retains diagnostics for retry", async () => {
	const documentId = await createDocument();
	const request = await createRequest(documentId, ["staging", "production"]);
	const approved = await approveRequest(request.id);
	const queued = await complete(context, {
		id: request.id,
		user: creator,
	});
	assert(queued.data);
	const failingContext: ServiceContext = {
		...context,
		config: {
			...context.config,
			hooks: [
				{
					service: "documents",
					event: "versionPromote",
					handler: async ({ data }) =>
						data.versionType === "production"
							? {
									error: {
										status: 409,
										message: {
											type: "lucid.literal",
											value: "Production is frozen",
										},
									},
									data: undefined,
								}
							: { error: undefined, data: undefined },
				},
			],
		},
	};
	expect(await consumeJob(failingContext, queued.data)).toEqual({
		type: "failed",
	});
	const failed = await readRequest(request.id);
	expect(failed).toMatchObject({
		status: "open",
		approved: true,
		failure: "Production is frozen",
		failureRequestDocumentId: member(approved).id,
		failureTarget: "production",
	});
	expect(await fieldOf(documentId, "summary", "staging")).toBeNull();
	expect(await fieldOf(documentId, "summary", "production")).toBeNull();
	const retry = await complete(context, {
		id: request.id,
		user: creator,
	});
	assert(retry.data);
	expect(retry.data.jobId).not.toBe(queued.data.jobId);
	expect(await consumeJob(context, retry.data)).toEqual({ type: "completed" });
	expect((await readRequest(request.id)).failure).toBeNull();
});

test("worker recovery and polling reconcile terminal request failures once", async () => {
	const documentId = await createDocument();
	const request = await createRequest(documentId);
	await approveRequest(request.id);
	const queued = await complete(context, {
		id: request.id,
		user: creator,
	});
	assert(queued.data);
	await context.db.kysely
		.updateTable("lucid_jobs")
		.set({
			status: "running",
			attempts: 1,
			lease_token: "abandoned",
			lease_expires_at: new Date(Date.now() - 1000).toISOString(),
		})
		.where("job_id", "=", queued.data.jobId)
		.execute();
	expect((await recoverExpiredJobs(context)).error).toBeUndefined();
	expect((await readRequest(request.id)).failure).not.toBeNull();
	// Simulate interruption between the job's failed write and its failure hook.
	await context.db.kysely
		.updateTable("lucid_requests")
		.set({ failure: null })
		.where("id", "=", request.id)
		.execute();
	const before = (await readRequest(request.id)).events.filter(
		(event) => event.type === "failed",
	).length;
	expect(
		(await getExecution(context, { id: request.id, user: creator })).data
			?.status,
	).toBe("failed");
	expect(
		(await readRequest(request.id)).events.filter(
			(event) => event.type === "failed",
		),
	).toHaveLength(before);
});

test("execution polling uses request collection permissions", async () => {
	const request = await createRequest(await createDocument());
	const unreadable: LucidUser = {
		...creator,
		superAdmin: false,
		permissions: [Permissions.RequestsRead],
	};
	expect(
		(await getExecution(context, { id: request.id, user: unreadable })).error
			?.status,
	).toBe(404);
	expect(
		(await getExecution(context, { id: request.id, user: creator })).data,
	).toBeNull();
});

test("requests hold at most 100 documents", async () => {
	const created = await createSingle(context, {
		title: "Too many",
		user: creator,
		documents: Array.from({ length: 101 }, (_, index) => ({
			collectionKey: "request_pages",
			documentId: 1_000_000 + index,
			source: "latest",
			targets: ["staging"],
		})),
	});
	expect(created.error?.status).toBe(413);
});
const completeNow = async (request: RequestDetail) => {
	await approveRequest(request.id);
	return completeRequest(request.id);
};
const acknowledge = async (
	request: RequestDetail,
	target: string,
	reviewed = true,
) => {
	const current = await readRequest(request.id);
	const destination = member(current).targets.find(
		(item) => item.target === target,
	);
	assert(destination);
	const result = await reviewTarget(context, {
		id: current.id,
		requestDocumentId: member(current).id,
		revision: current.revision,
		target,
		targetVersionId: destination.versionId,
		reviewed,
		user: reviewer,
	});
	assert(!result.error, JSON.stringify(result.error));
	return readRequest(request.id);
};
const alignContent = async (
	request: RequestDetail,
	source: string,
	/** Defaults to the proposal's current content. */
	destinationContentId?: string,
) => {
	const document = member(request);
	assert(document.versionId);
	const [current, proposal] = await Promise.all([
		readVersionContent(context, {
			collectionKey: document.collectionKey,
			documentId: document.documentId,
			versionType: source,
		}),
		readVersionContent(context, {
			collectionKey: document.collectionKey,
			documentId: document.documentId,
			versionId: document.versionId,
		}),
	]);
	assert(current.data && proposal.data);
	return align(context, {
		collectionKey: document.collectionKey,
		documentId: document.documentId,
		versionId: document.versionId,
		source,
		sourceContentId: current.data.contentId,
		destinationContentId: destinationContentId ?? proposal.data.contentId,
		user: creator,
	});
};

test("latest creates a private proposal and only accepts environment destinations", async () => {
	const id = await createDocument();
	const request = await createRequest(id, ["staging", "production"]);
	expect(member(request).source).toBe("latest");
	expect(request.blockers).toEqual([]);
	await editProposal(request, "Proposed");
	expect(await fieldOf(id, "summary", "latest")).toBe("Original");
	expect(
		await fieldOf(
			id,
			"summary",
			"proposal",
			member(request).versionId ?? undefined,
		),
	).toBe("Proposed");
	for (const input of [
		{ source: "latest", targets: ["latest"] },
		{ source: "latest", targets: [] },
		{ source: "proposal", targets: ["latest"] },
		{ source: "staging", targets: ["latest"] },
		{ source: "production", targets: ["staging"] },
	]) {
		expect(
			(
				await createSingle(context, {
					title: "Invalid",
					documents: [
						{ collectionKey: "request_pages", documentId: id, ...input },
					],
					user: creator,
				})
			).error?.status,
		).toBe(400);
	}
});

test("proposal requests replace selected environments and leave latest untouched", async () => {
	const id = await createDocument();
	const request = await createRequest(id, ["staging", "production"]);
	await editProposal(request, "Reviewed proposal");
	const approved = await approveRequest(request.id);
	expect((await readRequest(request.id)).approved).toBe(true);
	const completed = await completeRequest(request.id);
	expect(completed.status).toBe("completed");
	expect(member(completed).approvedVersionId).toBe(
		member(approved).approvedVersionId,
	);
	//* the approved snapshot holds the proposal's content, so the proposal is removed
	expect(member(completed).versionId).toBeNull();
	expect(member(completed).documentLabel).toBe(member(approved).documentLabel);
	expect(await fieldOf(id, "summary", "latest")).toBe("Original");
	expect(await fieldOf(id, "summary", "staging")).toBe("Reviewed proposal");
	expect(await fieldOf(id, "summary", "production")).toBe("Reviewed proposal");
});

test("parallel proposals and later latest edits remain independent during publication", async () => {
	const id = await createDocument();
	const first = await createRequest(id);
	const second = await createRequest(id);
	expect(member(first).versionId).not.toBe(member(second).versionId);
	await editProposal(first, "First summary");
	await editProposal(second, "Second summary");
	await editLatest(id, "Latest summary");
	const latest = await readVersionContent(context, {
		collectionKey: member(first).collectionKey,
		documentId: id,
		versionType: "latest",
	});
	assert(latest.data);
	await completeNow(first);
	const changed = await readRequest(second.id);
	expect(member(changed).targets).toMatchObject([
		{ target: "staging", changedSinceCreation: true, reviewed: false },
	]);
	expect(changed.blockers).toContainEqual({
		requestDocumentId: member(changed).id,
		code: "review_required",
		target: "staging",
	});
	await acknowledge(changed, "staging");
	await completeNow(second);
	expect(await fieldOf(id, "summary", "staging")).toBe("Second summary");
	expect(await fieldOf(id, "summary", "latest")).toBe("Latest summary");
	const unchanged = await readVersionContent(context, {
		collectionKey: member(first).collectionKey,
		documentId: id,
		versionType: "latest",
	});
	expect(unchanged.data?.id).toBe(latest.data.id);
	expect(
		await fieldOf(
			id,
			"summary",
			"snapshot",
			member(await readRequest(first.id)).approvedVersionId ?? undefined,
		),
	).toBe("First summary");
});

test("acknowledgement holds for the target version, survives proposal edits and rejects stale review", async () => {
	const id = await createDocument();
	await completeNow(await createRequest(id));
	const first = await createRequest(id);
	const second = await createRequest(id);
	await editProposal(first, "First proposal");
	await editProposal(second, "Second proposal");
	await completeNow(first);
	const changed = await readRequest(second.id);
	expect(
		(await approve(context, { ...reviewInput(changed), user: reviewer })).error
			?.status,
	).toBe(409);
	const stale = {
		id: changed.id,
		requestDocumentId: member(changed).id,
		revision: changed.revision,
		target: "staging",
		targetVersionId: member(changed).targets[0]?.versionId ?? null,
		reviewed: true,
		user: reviewer,
	};
	await acknowledge(changed, "staging");
	await approveRequest(second.id);
	await acknowledge(changed, "staging", false);
	const withdrawn = await readRequest(second.id);
	expect(withdrawn.approved).toBe(false);
	expect(
		withdrawn.events
			.filter(
				(event) =>
					event.type === "target_reviewed" ||
					event.type === "target_unreviewed",
			)
			.map((event) => event.type),
	).toEqual(["target_reviewed", "target_unreviewed"]);
	await acknowledge(changed, "staging");
	const edited = await editProposal(second, "Revised proposal");
	expect(member(edited).targets[0]).toMatchObject({ reviewed: true });
	await approveRequest(second.id);
	const third = await createRequest(id);
	await editProposal(third, "Third proposal");
	await completeNow(third);
	const republished = await readRequest(second.id);
	expect(republished.approved).toBe(false);
	expect(member(republished).targets[0]).toMatchObject({ reviewed: false });
	expect(
		(
			await reviewTarget(context, {
				...stale,
				revision: republished.revision,
			})
		).error?.status,
	).toBe(409);
	expect(
		(await complete(context, { id: second.id, user: creator })).error?.status,
	).toBe(409);
	await acknowledge(republished, "staging");
	await completeNow(second);
	expect(await fieldOf(id, "summary", "staging")).toBe("Revised proposal");
	expect(await fieldOf(id, "summary", "latest")).toBe("Original");
});

test("a request closed while its target is published asks for review once reopened", async () => {
	const id = await createDocument();
	const request = await createRequest(id);
	expect(
		(await close(context, { id: request.id, user: creator })).error,
	).toBeUndefined();
	const publisher = await createRequest(id);
	await editProposal(publisher, "Published while closed");
	await completeNow(publisher);
	expect(
		(await reopen(context, { id: request.id, user: creator })).error,
	).toBeUndefined();
	expect((await readRequest(request.id)).blockers).toContainEqual({
		requestDocumentId: member(request).id,
		code: "review_required",
		target: "staging",
	});
});

test("anyone who can read a request and edit its document can acknowledge a changed target", async () => {
	const id = await createDocument();
	const request = await createRequest(id);
	await completeNow(await createRequest(id));
	const changed = await readRequest(request.id);
	const input = {
		id: changed.id,
		requestDocumentId: member(changed).id,
		revision: changed.revision,
		target: "staging",
		targetVersionId: member(changed).targets[0]?.versionId ?? null,
		reviewed: true,
	};
	const readOnly: LucidUser = {
		...creator,
		superAdmin: false,
		permissions: [
			Permissions.RequestsRead,
			getCollectionPermission("request_pages", "read"),
		],
	};
	expect(
		(await reviewTarget(context, { ...input, user: readOnly })).error?.status,
	).toBe(403);
	const editor: LucidUser = {
		...readOnly,
		permissions: [
			...(readOnly.permissions ?? []),
			getCollectionPermission("request_pages", "update"),
		],
	};
	expect(
		(await reviewTarget(context, { ...input, user: editor })).error,
	).toBeUndefined();
	expect(member(await readRequest(request.id)).targets[0]).toMatchObject({
		reviewed: true,
	});
});

test("publishing records activity on other open requests, including targets added later", async () => {
	const id = await createDocument();
	const request = await createRequest(id, ["production"]);
	const publisher = await createRequest(id);
	await editProposal(publisher, "Published elsewhere");
	await completeNow(publisher);
	expect(
		(await readRequest(publisher.id)).events.some(
			(event) => event.type === "target_published",
		),
	).toBe(false);
	const recorded = await readRequest(request.id);
	expect(recorded.events).toContainEqual(
		expect.objectContaining({ type: "target_published", target: "staging" }),
	);
	expect(member(recorded).targets).toMatchObject([
		{ target: "production", changedSinceCreation: false },
	]);
	const readded = await updateTargets(context, {
		id: request.id,
		requestDocumentId: member(request).id,
		targets: ["staging", "production"],
		user: creator,
	});
	assert(!readded.error, JSON.stringify(readded.error));
	const retargeted = await readRequest(request.id);
	expect(
		member(retargeted).targets.find((target) => target.target === "staging"),
	).toMatchObject({ changedSinceCreation: true, reviewed: false });
	expect((await alignContent(retargeted, "staging")).error).toBeUndefined();
	expect(
		(await readRequest(request.id)).blockers.some(
			(blocker) => blocker.code === "review_required",
		),
	).toBe(true);
});

test("approval freezes the reviewed proposal, is dismissed when it changes and survives latest edits", async () => {
	const id = await createDocument();
	const request = await createRequest(id);
	const staleReview = reviewInput(request);
	await editProposal(request, "Edited before approval");
	expect(
		(await approve(context, { ...staleReview, user: reviewer })).error?.status,
	).toBe(409);
	const approved = await approveRequest(request.id);
	expect(member(approved).approvedVersionId).not.toBe(
		member(approved).versionId,
	);
	await editProposal(approved, "Edited after approval");
	expect((await readRequest(request.id)).approved).toBe(false);
	expect(
		(await complete(context, { id: request.id, user: creator })).error?.status,
	).toBe(409);
	await approveRequest(request.id);
	await editLatest(id, "Changed latest");
	expect((await readRequest(request.id)).approved).toBe(true);
});

test("environment sources are immutable snapshots, even when the environment advances", async () => {
	const id = await createDocument();
	await completeNow(await createRequest(id, ["staging"]));
	const request = await createRequest(id, ["production"], "staging");
	expect(member(request).source).toBe("staging");
	const attemptedEdit = await updateVersion(context, {
		collectionKey: member(request).collectionKey,
		documentId: id,
		versionId: versionOf(request),
		userId: creator.id,
		authUser: creator,
		fields: [{ key: "title", type: "text", value: "Changed" }],
	});
	expect(attemptedEdit.error).toBeDefined();
	const next = await createRequest(id, ["staging"]);
	await editProposal(next, "Next staging");
	await completeNow(next);
	expect(await fieldOf(id, "summary", "snapshot", versionOf(request))).toBe(
		"Original",
	);
	expect((await readRequest(request.id)).blockers).toContainEqual({
		requestDocumentId: member(request).id,
		code: "prerequisite",
		target: "production",
		required: "staging",
	});
});

test("target changes require new approval while title, reviewer and schedule changes retain it", async () => {
	const id = await createDocument();
	const request = await createRequest(id, ["staging"]);
	const author: LucidUser = {
		...creator,
		superAdmin: false,
		permissions: [
			Permissions.RequestsRead,
			...(["read", "update", "review"] as const).map((action) =>
				getCollectionPermission("request_pages", action),
			),
		],
	};
	expect(
		(await approve(context, { ...reviewInput(request), user: author })).error
			?.status,
	).toBe(403);
	await approveRequest(request.id);
	const updated = await updateSingle(context, {
		id: request.id,
		user: creator,
		title: "Renamed",
		reviewerIds: [reviewer.id],
		scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
		scheduledTimezone: "Europe/London",
	});
	assert(!updated.error, JSON.stringify(updated.error));
	expect((await readRequest(request.id)).approved).toBe(true);
	const changed = await updateTargets(context, {
		id: request.id,
		requestDocumentId: member(request).id,
		user: creator,
		targets: ["staging", "production"],
	});
	assert(!changed.error, JSON.stringify(changed.error));
	const retargeted = await readRequest(request.id);
	expect(retargeted.approved).toBe(false);
	expect(member(retargeted).versionId).toBe(member(request).versionId);
});

test("adding and removing reviewers is added to the activity", async () => {
	const request = await createRequest(await createDocument());
	const setReviewerIds = async (reviewerIds: number[]) => {
		const updated = await updateSingle(context, {
			id: request.id,
			user: creator,
			reviewerIds,
		});
		assert(!updated.error, JSON.stringify(updated.error));
	};
	await setReviewerIds([reviewer.id]);
	await setReviewerIds([reviewer.id]);
	await setReviewerIds([]);
	const events = (await readRequest(request.id)).events.flatMap((event) =>
		event.type === "reviewer_added" || event.type === "reviewer_removed"
			? [{ type: event.type, reviewer: event.reviewer?.id }]
			: [],
	);
	expect(events).toEqual([
		{ type: "reviewer_added", reviewer: reviewer.id },
		{ type: "reviewer_removed", reviewer: reviewer.id },
	]);
});

test("comments withdraw approval, and every comment must be resolved before approving again", async () => {
	const id = await createDocument();
	const request = await createRequest(id);
	const body = {
		type: "doc" as const,
		content: [
			{
				type: "paragraph",
				content: [{ type: "text", text: "Check the hero" }],
			},
		],
	};
	const commented = await createComment(context, {
		id: request.id,
		user: creator,
		body,
	});
	assert(!commented.error, JSON.stringify(commented.error));
	const withComment = await readRequest(request.id);
	expect(
		(await approve(context, { ...reviewInput(withComment), user: reviewer }))
			.error?.status,
	).toBe(409);
	const comment = withComment.events.find((event) => event.type === "comment");
	assert(comment);
	const resolved = await updateCommentResolution(context, {
		id: request.id,
		eventId: comment.id,
		user: reviewer,
		resolution: "resolved",
	});
	assert(!resolved.error, JSON.stringify(resolved.error));
	expect((await readRequest(request.id)).openComments).toBe(0);
	await approveRequest(request.id);
	//* the approver's own comment withdraws the approval and must be resolved too
	await createComment(context, { id: request.id, user: reviewer, body });
	const withOwnComment = await readRequest(request.id);
	expect(withOwnComment.approved).toBe(false);
	expect(withOwnComment.openComments).toBe(1);
	expect(
		(
			await approve(context, {
				...reviewInput(withOwnComment),
				user: reviewer,
			})
		).error?.status,
	).toBe(409);
});

test("replies leave approval alone, go one level deep and are deleted with their thread", async () => {
	const request = await createRequest(await createDocument());
	const body = {
		type: "doc" as const,
		content: [
			{ type: "paragraph", content: [{ type: "text", text: "Looks good" }] },
		],
	};
	await createComment(context, { id: request.id, user: creator, body });
	const comment = (await readRequest(request.id)).events.find(
		(event) => event.type === "comment",
	);
	assert(comment);
	await updateCommentResolution(context, {
		id: request.id,
		eventId: comment.id,
		user: reviewer,
		resolution: "resolved",
	});
	await approveRequest(request.id);

	const replied = await createComment(context, {
		id: request.id,
		user: creator,
		body,
		parentId: comment.id,
	});
	assert(!replied.error, JSON.stringify(replied.error));
	const withReply = await getSingle(context, {
		id: request.id,
		user: reviewer,
	});
	assert(withReply.data, JSON.stringify(withReply.error));
	expect(withReply.data.approved).toBe(true);
	expect(withReply.data.openComments).toBe(0);
	const thread = withReply.data.events.filter(
		(event) => event.type === "comment",
	);
	expect(thread).toHaveLength(1);
	const reply = thread[0]?.type === "comment" ? thread[0].replies[0] : null;
	assert(reply);

	expect(
		(
			await createComment(context, {
				id: request.id,
				user: creator,
				body,
				parentId: reply.id,
			})
		).error?.status,
	).toBe(404);
	expect(
		(
			await updateCommentResolution(context, {
				id: request.id,
				eventId: reply.id,
				user: creator,
				resolution: "closed",
			})
		).error?.status,
	).toBe(404);

	const deleted = await deleteComment(context, {
		id: request.id,
		eventId: comment.id,
		user: creator,
	});
	assert(!deleted.error, JSON.stringify(deleted.error));
	const remaining = await context.db.kysely
		.selectFrom("lucid_request_events")
		.select("id")
		.where("id", "=", reply.id)
		.execute();
	expect(remaining).toEqual([]);
});

test("mentions in comments and descriptions are limited to people who can read the request", async () => {
	const request = await createRequest(await createDocument());
	const outsider = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${randomUUID()}@example.test`,
			username: randomUUID(),
			secret: "test",
			super_admin: false,
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	const mention = (userId: number) => ({
		type: "doc" as const,
		content: [
			{
				type: "paragraph",
				content: [
					{ type: "lucidMention", attrs: { userId, label: "Someone else" } },
				],
			},
		],
	});

	expect(
		(
			await createComment(context, {
				id: request.id,
				user: creator,
				body: mention(outsider.id),
			})
		).error?.status,
	).toBe(400);
	expect(
		(
			await updateSingle(context, {
				id: request.id,
				user: creator,
				description: mention(outsider.id),
			})
		).error?.status,
	).toBe(400);
	const mentioned = await createComment(context, {
		id: request.id,
		user: creator,
		body: mention(reviewer.id),
	});
	assert(!mentioned.error, JSON.stringify(mentioned.error));
	const comment = (await readRequest(request.id)).events.find(
		(event) => event.type === "comment",
	);
	expect(
		comment?.type === "comment"
			? comment.body.content?.[0]?.content?.[0]?.attrs?.label
			: null,
	).toBe(reviewer.username);
});

test("editing a description only tells people newly mentioned in it", async () => {
	const request = await createRequest(await createDocument());
	const description = (userIds: number[]) => ({
		type: "doc" as const,
		content: [
			{
				type: "paragraph",
				content: userIds.map((userId) => ({
					type: "lucidMention",
					attrs: { userId, label: "Someone" },
				})),
			},
		],
	});
	const mentions = async (userId: number) =>
		(
			await context.db.kysely
				.selectFrom("lucid_notifications")
				.innerJoin(
					"lucid_notification_recipients",
					"lucid_notification_recipients.notification_id",
					"lucid_notifications.id",
				)
				.select("lucid_notifications.id")
				.where("lucid_notifications.type", "=", "requests:mentioned")
				.where("lucid_notification_recipients.user_id", "=", userId)
				.execute()
		).length;
	const edit = async (userIds: number[]) => {
		const updated = await updateSingle(context, {
			id: request.id,
			user: creator,
			description: description(userIds),
		});
		assert(!updated.error, JSON.stringify(updated.error));
	};

	const before = await mentions(reviewer.id);
	await edit([reviewer.id]);
	await edit([reviewer.id]);
	expect(await mentions(reviewer.id)).toBe(before + 1);

	const secondBefore = await mentions(secondReviewer.id);
	await edit([reviewer.id, secondReviewer.id]);
	expect(await mentions(reviewer.id)).toBe(before + 1);
	expect(await mentions(secondReviewer.id)).toBe(secondBefore + 1);
});

test("assignment to-dos clear at the last workflow stage and when the request closes", async () => {
	const key = "reset_pages";
	const request = await createRequest(
		await createDocument(key),
		["staging"],
		"latest",
		key,
	);
	const move = async (stage: string, assigneeIds?: number[]) => {
		const result = await updateWorkflow(context, {
			collectionKey: key,
			documentId: member(request).documentId,
			versionId: versionOf(request),
			stage,
			assigneeIds,
			user: creator,
		});
		expect(result.error).toBeUndefined();
	};
	const assignment = async () => {
		const workflow = await context.db.kysely
			.selectFrom("lucid_document_workflows")
			.select("id")
			.where("collection_key", "=", key)
			.where("version_id", "=", versionOf(request))
			.executeTakeFirstOrThrow();
		return context.db.kysely
			.selectFrom("lucid_notifications")
			.select(["resolved_at"])
			.where("type", "=", "workflows:assigned")
			.where("key", "=", `workflow:${workflow.id}:assignee:${reviewer.id}`)
			.executeTakeFirstOrThrow();
	};

	await move("review", [reviewer.id]);
	expect((await assignment()).resolved_at).toBeNull();
	await move("ready");
	expect((await assignment()).resolved_at).not.toBeNull();
	await move("review");
	expect((await assignment()).resolved_at).toBeNull();

	const closed = await close(context, { id: request.id, user: creator });
	expect(closed.error).toBeUndefined();
	expect((await assignment()).resolved_at).not.toBeNull();
});

test("target, workflow and proposal changes are recorded in the activity", async () => {
	const id = await createDocument();
	const request = await createRequest(id);
	await updateTargets(context, {
		id: request.id,
		requestDocumentId: member(request).id,
		user: creator,
		targets: ["staging", "production"],
	});
	await editProposal(request, "First edit");
	await editProposal(request, "Second edit");
	const types = (await readRequest(request.id)).events.map(
		(event) => event.type,
	);
	expect(types).toContain("target_added");
	//* consecutive edits by one person are recorded once
	expect(types.filter((type) => type === "proposal_edited")).toHaveLength(1);
});

test("listing and reading enforce the document's collection permission", async () => {
	const id = await createDocument("request_articles");
	const request = await createRequest(
		id,
		["staging"],
		"latest",
		"request_articles",
	);
	const pagesOnly: LucidUser = {
		...reviewer,
		superAdmin: false,
		permissions: [
			Permissions.RequestsRead,
			getCollectionPermission("request_pages", "read"),
		],
	};
	const listed = await getMultiple(context, {
		user: pagesOnly,
		query: { page: 1, perPage: 100 },
	});
	assert(listed.data, JSON.stringify(listed.error));
	expect(listed.data.data.map((row) => row.id)).not.toContain(request.id);
	expect(
		(await getSingle(context, { id: request.id, user: pagesOnly })).error
			?.status,
	).toBe(404);
});

test("closing preserves proposal and comments, and reopening restores edit access", async () => {
	const id = await createDocument();
	const request = await createRequest(id);
	const body = {
		type: "doc",
		content: [
			{ type: "paragraph", content: [{ type: "text", text: "Ready" }] },
		],
	};
	const commented = await createComment(context, {
		id: request.id,
		user: creator,
		body,
	});
	assert(!commented.error, JSON.stringify(commented.error));
	const comment = (await readRequest(request.id)).events.find(
		(event) => event.type === "comment",
	);
	assert(comment);
	expect(
		(
			await deleteComment(context, {
				id: request.id,
				eventId: comment.id,
				user: {
					...reviewer,
					superAdmin: false,
					permissions: [
						Permissions.RequestsRead,
						getCollectionPermission("request_pages", "read"),
					],
				},
			})
		).error?.status,
	).toBe(404);
	const closeRes = await close(context, { id: request.id, user: creator });
	assert(!closeRes.error, JSON.stringify(closeRes.error));
	const closed = await readRequest(request.id);
	expect(closed.permissions.edit).toBe(false);
	expect(member(closed).versionId).toBe(member(request).versionId);
	const reopenRes = await reopen(context, { id: request.id, user: creator });
	assert(!reopenRes.error, JSON.stringify(reopenRes.error));
	const reopened = await readRequest(request.id);
	expect(reopened.permissions.edit).toBe(true);
	expect(reopened.events.map((event) => event.type)).toEqual([
		"comment",
		"closed",
		"reopened",
	]);
});

test("new requests have timestamps and sort by their latest update", async () => {
	const documentId = await createDocument();
	const first = await createRequest(documentId);
	const second = await createRequest(documentId);
	expect(first.updatedAt).toBe(first.createdAt);
	expect(second.updatedAt).toBe(second.createdAt);
	const Requests = new RequestsRepository(context.db);
	const firstTimestamp = await Requests.updateSingle({
		where: [{ key: "id", operator: "=", value: first.id }],
		data: { updated_at: "2026-01-01T00:00:00.000Z" },
	});
	expect(firstTimestamp.error).toBeUndefined();
	const secondTimestamp = await Requests.updateSingle({
		where: [{ key: "id", operator: "=", value: second.id }],
		data: { updated_at: "2026-01-02T00:00:00.000Z" },
	});
	expect(secondTimestamp.error).toBeUndefined();
	const list = () =>
		getMultiple(context, {
			user: creator,
			query: {
				filter: { documentId: { value: documentId, operator: "=" } },
				sort: [{ key: "updatedAt", direction: "desc" }],
				page: 1,
				perPage: 10,
			},
		});
	expect((await list()).data?.data.map((request) => request.id)).toEqual([
		second.id,
		first.id,
	]);
	const updated = await updateSingle(context, {
		id: first.id,
		title: "Updated request",
		user: creator,
	});
	expect(updated.error).toBeUndefined();
	expect((await list()).data?.data.map((request) => request.id)).toEqual([
		first.id,
		second.id,
	]);
});

test("the involvesMe filter lists requests the user made or reviews", async () => {
	const documentId = await createDocument();
	const reviewed = await createRequest(documentId);
	const unrelated = await createRequest(documentId);
	const assigned = await updateSingle(context, {
		id: reviewed.id,
		user: creator,
		reviewerIds: [reviewer.id],
	});
	assert(!assigned.error, JSON.stringify(assigned.error));
	const list = async (user: LucidUser) => {
		const listed = await getMultiple(context, {
			user,
			query: {
				filter: {
					documentId: { value: documentId, operator: "=" },
					involvesMe: { value: "true", operator: "=" },
				},
				page: 1,
				perPage: 10,
			},
		});
		assert(listed.data, JSON.stringify(listed.error));
		return listed.data.data
			.map((request) => request.id)
			.toSorted((a, b) => a - b);
	};
	expect(await list(creator)).toEqual([reviewed.id, unrelated.id]);
	expect(await list(reviewer)).toEqual([reviewed.id]);
});

test("the addable filter lists open publish requests the user can add the document to", async () => {
	const documentId = await createDocument();
	const other = await createDocument();
	const holding = await createSingle(context, {
		title: "Holding",
		documents: [documentId, other].map((id) => ({
			collectionKey: "request_pages",
			documentId: id,
			source: "latest",
			targets: ["staging"],
		})),
		user: creator,
	});
	assert(holding.data, JSON.stringify(holding.error));
	const open = await createRequest(other);
	const closed = await createRequest(other);
	expect(
		(await close(context, { id: closed.id, user: creator })).error,
	).toBeUndefined();
	const list = async (user: LucidUser) => {
		const listed = await getMultiple(context, {
			user,
			query: {
				filter: {
					documentId: { value: other, operator: "=" },
					addable: { value: `request_pages:${documentId}`, operator: "=" },
				},
				page: 1,
				perPage: 10,
			},
		});
		assert(listed.data, JSON.stringify(listed.error));
		return listed.data.data.map((request) => request.id);
	};
	expect(await list(creator)).toEqual([open.id]);
	const readOnly: LucidUser = {
		...creator,
		superAdmin: false,
		permissions: [
			Permissions.RequestsRead,
			getCollectionPermission("request_pages", "read"),
		],
	};
	expect(await list(readOnly)).toEqual([]);
});

test("proposals start with the default workflow, and only their own stage changes dismiss approval", async () => {
	const key = "workflow_pages";
	const id = await createDocument(key);
	const latest = await readVersionContent(context, {
		collectionKey: key,
		documentId: id,
		versionType: "latest",
	});
	assert(latest.data);
	expect(
		(
			await getWorkflow(context, {
				collectionKey: key,
				documentId: id,
				versionId: null,
			})
		).data?.stage,
	).toBe("draft");
	const move = async (
		versionId: number,
		stage?: string,
		assigneeIds?: number[],
	) => {
		const result = await updateWorkflow(context, {
			collectionKey: key,
			documentId: id,
			versionId,
			stage,
			assigneeIds,
			user: creator,
		});
		expect(result.error).toBeUndefined();
	};
	await move(latest.data.id, "ready", [creator.id]);
	const first = await createRequest(id, ["staging"], "latest", key);
	const second = await createRequest(id, ["staging"], "latest", key);
	expect(member(first).workflowStage).toBe("draft");
	expect(member(second).workflowStage).toBe("draft");
	const initialWorkflow = await getWorkflow(context, {
		collectionKey: key,
		documentId: id,
		versionId: versionOf(first),
	});
	expect(initialWorkflow.data?.assignees).toEqual([]);
	await move(versionOf(first), "ready");
	await move(versionOf(second), "ready", [creator.id]);
	await approveRequest(first.id);
	await approveRequest(second.id);
	await move(versionOf(first), undefined, [reviewer.id]);
	expect((await readRequest(first.id)).approved).toBe(true);
	await move(versionOf(first), "draft");
	expect((await readRequest(first.id)).approved).toBe(false);
	expect(member(await readRequest(first.id)).workflowStage).toBe("draft");
	expect((await readRequest(second.id)).approved).toBe(true);
	await move(latest.data.id, "draft");
	expect((await readRequest(second.id)).approved).toBe(true);
	await completeRequest(second.id);
	await editLatest(id, "Another draft", key);
	const saved = await getWorkflow(context, {
		collectionKey: key,
		documentId: id,
		versionId: null,
	});
	expect(saved.data?.stage).toBe("draft");
	expect(saved.data?.assignees.map((assignee) => assignee.userId)).toEqual([
		creator.id,
	]);
	const promotion = await createRequest(id, ["production"], "staging", key);
	expect(member(promotion).workflowStage).toBeNull();
	expect(promotion.blockers).toEqual([]);
	await approveRequest(promotion.id);
	await completeRequest(promotion.id);
	const environment = await getDocument(context, {
		collectionKey: key,
		id,
		version: "staging",
		query: {},
		authUser: creator,
	});
	expect(environment.data?.document.workflow).toBeNull();
});

test("aligning proposals preserves their workflow and rejects stale replacement requests", async () => {
	const key = "workflow_pages";
	const id = await createDocument(key);
	const first = await createRequest(id, ["staging"], "latest", key);
	const sibling = await createRequest(id, ["staging"], "latest", key);
	expect(
		(
			await updateWorkflow(context, {
				collectionKey: key,
				documentId: id,
				versionId: versionOf(first),
				stage: "ready",
				assigneeIds: [reviewer.id],
				user: creator,
			})
		).error,
	).toBeUndefined();
	await editProposal(first, "Proposal edits");
	await editProposal(sibling, "Sibling edits");
	const approved = await approveRequest(first.id);
	const proposal = await readVersionContent(context, {
		collectionKey: key,
		documentId: id,
		versionId: member(approved).versionId ?? undefined,
	});
	assert(proposal.data);
	expect((await alignContent(approved, "latest")).error).toBeUndefined();
	const aligned = await readRequest(first.id);
	expect(aligned.approved).toBe(false);
	expect(member(aligned).versionId).toBe(member(first).versionId);
	expect(member(aligned).workflowStage).toBe("ready");
	const workflow = await getWorkflow(context, {
		collectionKey: key,
		documentId: id,
		versionId: versionOf(first),
	});
	expect(workflow.data?.assignees.map((assignee) => assignee.userId)).toEqual([
		reviewer.id,
	]);
	expect(await fieldOf(id, "summary", "proposal", versionOf(first), key)).toBe(
		"Original",
	);
	expect(
		await fieldOf(
			id,
			"summary",
			"proposal",
			member(sibling).versionId ?? undefined,
			key,
		),
	).toBe("Sibling edits");
	expect(
		(await alignContent(approved, "latest", proposal.data.contentId)).error
			?.status,
	).toBe(409);
});

test("aligning latest with an environment retains the old latest as a revision and preserves workflow", async () => {
	const key = "workflow_pages";
	const id = await createDocument(key);
	const request = await createRequest(id, ["staging"], "latest", key);
	expect(
		(
			await updateWorkflow(context, {
				collectionKey: key,
				documentId: id,
				versionId: versionOf(request),
				stage: "ready",
				user: creator,
			})
		).error,
	).toBeUndefined();
	await editProposal(request, "Staging content");
	await completeNow(request);
	await editLatest(id, "Latest edits", key);
	const latest = await readVersionContent(context, {
		collectionKey: key,
		documentId: id,
		versionType: "latest",
	});
	const staging = await readVersionContent(context, {
		collectionKey: key,
		documentId: id,
		versionType: "staging",
	});
	assert(latest.data && staging.data);
	expect(
		(
			await updateWorkflow(context, {
				collectionKey: key,
				documentId: id,
				versionId: latest.data.id,
				stage: "draft",
				assigneeIds: [creator.id],
				user: creator,
			})
		).error,
	).toBeUndefined();
	const input = {
		collectionKey: key,
		documentId: id,
		versionId: latest.data.id,
		source: "staging",
		sourceContentId: staging.data.contentId,
		destinationContentId: latest.data.contentId,
		user: creator,
	};
	expect(
		(await align(context, { ...input, sourceContentId: "stale" })).error
			?.status,
	).toBe(409);
	expect((await align(context, input)).error).toBeUndefined();
	const aligned = await readVersionContent(context, {
		collectionKey: key,
		documentId: id,
		versionType: "latest",
	});
	assert(aligned.data);
	expect(aligned.data.id).not.toBe(latest.data.id);
	expect(await fieldOf(id, "summary", "latest", undefined, key)).toBe(
		"Staging content",
	);
	expect(await fieldOf(id, "summary", "revision", latest.data.id, key)).toBe(
		"Latest edits",
	);
	const workflow = await getWorkflow(context, {
		collectionKey: key,
		documentId: id,
		versionId: null,
	});
	expect(workflow.data?.stage).toBe("draft");
	expect(workflow.data?.assignees.map((assignee) => assignee.userId)).toEqual([
		creator.id,
	]);
	expect(
		(
			await align(context, {
				...input,
				source: "latest",
				versionId: aligned.data.id,
				destinationContentId: aligned.data.contentId,
			})
		).error?.status,
	).toBe(400);
});

test("cross-collection requests publish every document and target without changing latest", async () => {
	const pageId = await createDocument("request_pages", "Page", "Page original");
	const articleId = await createDocument(
		"request_articles",
		"Article",
		"Article original",
	);
	const created = await createSingle(context, {
		title: "Grouped launch",
		user: creator,
		documents: [
			{
				collectionKey: "request_pages",
				documentId: pageId,
				source: "latest",
				targets: ["staging", "production"],
			},
			{
				collectionKey: "request_articles",
				documentId: articleId,
				source: "latest",
				targets: ["staging"],
			},
		],
	});
	assert(created.data, JSON.stringify(created.error));
	const grouped = await readRequest(created.data.id);
	expect(grouped.documents).toHaveLength(2);
	for (const document of grouped.documents) {
		assert(document.versionId);
		const edited = await updateVersion(context, {
			collectionKey: document.collectionKey,
			documentId: document.documentId,
			versionId: document.versionId,
			userId: creator.id,
			authUser: creator,
			fields: [
				{ key: "title", type: "text", value: "Reviewed" },
				{
					key: "summary",
					type: "text",
					value: `Reviewed ${document.collectionKey}`,
				},
			],
		});
		expect(edited.error).toBeUndefined();
	}
	const approved = await approveRequest(created.data.id);
	expect(
		approved.documents.every(
			(document) => document.approvedVersionId !== document.versionId,
		),
	).toBe(true);
	const published = await completeRequest(approved.id);
	expect(published.status).toBe("completed");
	for (const document of published.documents) {
		for (const target of document.targets) {
			expect(
				await fieldOf(
					document.documentId,
					"summary",
					target.target,
					undefined,
					document.collectionKey,
				),
			).toBe(`Reviewed ${document.collectionKey}`);
		}
	}
	expect(await fieldOf(pageId, "summary", "latest")).toBe("Page original");
	expect(
		await fieldOf(
			articleId,
			"summary",
			"latest",
			undefined,
			"request_articles",
		),
	).toBe("Article original");
	const listed = await getMultiple(context, {
		user: creator,
		query: {
			filter: {
				collectionKey: { value: "request_articles", operator: "=" },
				documentId: { value: articleId, operator: "=" },
			},
			page: 1,
			perPage: 10,
		},
	});
	assert(listed.data, JSON.stringify(listed.error));
	expect(
		listed.data.data.find((request) => request.id === approved.id)?.documents,
	).toHaveLength(2);
});

test("membership changes dismiss group approval, clean up private versions and reject duplicates", async () => {
	const pageId = await createDocument();
	const articleId = await createDocument("request_articles");
	const request = await createRequest(pageId);
	const oldReview = reviewInput(await approveRequest(request.id));
	const added = await addDocuments(context, {
		id: request.id,
		documents: [
			{
				collectionKey: "request_articles",
				documentId: articleId,
				source: "latest",
				targets: ["staging"],
			},
		],
		user: creator,
	});
	assert(!added.error, JSON.stringify(added.error));
	const withArticle = await readRequest(request.id);
	expect(withArticle.approved).toBe(false);
	expect(withArticle.documents).toHaveLength(2);
	expect(
		(await approve(context, { ...oldReview, user: reviewer })).error?.status,
	).toBe(409);
	expect(
		(
			await addDocuments(context, {
				id: request.id,
				documents: [
					{
						collectionKey: "request_articles",
						documentId: articleId,
						source: "latest",
						targets: ["staging"],
					},
				],
				user: creator,
			})
		).error?.status,
	).toBe(409);
	const approved = await approveRequest(request.id);
	const article = approved.documents.find(
		(document) => document.collectionKey === "request_articles",
	);
	assert(article?.versionId);
	const removed = await removeDocument(context, {
		id: request.id,
		requestDocumentId: article.id,
		user: creator,
	});
	assert(!removed.error, JSON.stringify(removed.error));
	const withoutArticle = await readRequest(request.id);
	expect(withoutArticle.approved).toBe(false);
	expect(withoutArticle.documents).toHaveLength(1);
	expect(
		(
			await readVersionContent(context, {
				collectionKey: article.collectionKey,
				documentId: article.documentId,
				versionType: "proposal",
				versionId: article.versionId,
			})
		).data,
	).toBeNull();
	expect(
		(
			await removeDocument(context, {
				id: request.id,
				requestDocumentId: member(withoutArticle).id,
				user: creator,
			})
		).error?.status,
	).toBe(400);
	const readded = await addDocuments(context, {
		id: request.id,
		documents: [
			{
				collectionKey: "request_articles",
				documentId: articleId,
				source: "latest",
				targets: ["staging"],
			},
		],
		user: creator,
	});
	assert(!readded.error, JSON.stringify(readded.error));
	expect(
		(await readRequest(request.id)).documents.find(
			(document) => document.collectionKey === "request_articles",
		)?.versionId,
	).not.toBe(article.versionId);
});

test.each([
	"response",
	"throw",
] as const)("a %s failure on a later document rolls back the group and can be retried", async (failureMode) => {
	const pageId = await createDocument();
	const articleId = await createDocument("request_articles");
	const created = await createSingle(context, {
		title: "Atomic launch",
		user: creator,
		documents: [
			{
				collectionKey: "request_pages",
				documentId: pageId,
				source: "latest",
				targets: ["staging"],
			},
			{
				collectionKey: "request_articles",
				documentId: articleId,
				source: "latest",
				targets: ["staging"],
			},
		],
	});
	assert(created.data, JSON.stringify(created.error));
	const approved = await approveRequest(created.data.id);
	const failedDocument = approved.documents.at(-1);
	assert(failedDocument);
	const failingContext: ServiceContext = {
		...context,
		config: {
			...context.config,
			hooks: [
				...context.config.hooks,
				{
					service: "documents",
					event: "versionPromote",
					handler: async ({ meta }) => {
						if (meta.collectionKey !== failedDocument.collectionKey) {
							return { error: undefined, data: undefined };
						}
						if (failureMode === "throw") {
							throw new Error("Unexpected hook failure");
						}
						return {
							error: {
								status: 409,
								message: {
									type: "lucid.literal",
									value: "Target is frozen",
								},
							},
							data: undefined,
						};
					},
				},
			],
		},
	};
	const queued = await complete(context, { id: approved.id, user: creator });
	assert(queued.data, JSON.stringify(queued.error));
	expect(await consumeJob(failingContext, queued.data)).toEqual({
		type: "failed",
	});
	const detail = await readRequest(approved.id);
	expect(detail).toMatchObject({
		status: "open",
		approved: true,
		failure: failureMode === "throw" ? expect.any(String) : "Target is frozen",
		failureRequestDocumentId: failedDocument.id,
		failureTarget: "staging",
	});
	for (const document of detail.documents) {
		expect(
			await fieldOf(
				document.documentId,
				"summary",
				"staging",
				undefined,
				document.collectionKey,
			),
		).toBeNull();
	}
	const retried = await completeRequest(approved.id);
	expect(retried).toMatchObject({
		status: "completed",
		failure: null,
		failureRequestDocumentId: null,
		failureTarget: null,
	});
	for (const document of retried.documents) {
		expect(
			await fieldOf(
				document.documentId,
				"summary",
				"staging",
				undefined,
				document.collectionKey,
			),
		).toBe("Original");
	}
});

test("drift review is scoped to its member, and edits to either proposal dismiss approval", async () => {
	const firstId = await createDocument();
	const secondId = await createDocument();
	const grouped = await createSingle(context, {
		title: "Parallel launch",
		user: creator,
		documents: [firstId, secondId].map((documentId) => ({
			collectionKey: "request_pages",
			documentId,
			source: "latest",
			targets: ["staging"],
		})),
	});
	assert(grouped.data, JSON.stringify(grouped.error));
	const independent = await createRequest(firstId);
	await completeNow(independent);
	const changed = await readRequest(grouped.data.id);
	const first = changed.documents.find(
		(document) => document.documentId === firstId,
	);
	const second = changed.documents.find(
		(document) => document.documentId === secondId,
	);
	assert(first && second);
	expect(first.targets[0]?.changedSinceCreation).toBe(true);
	expect(second.targets[0]?.changedSinceCreation).toBe(false);
	expect(changed.blockers).toEqual([
		{ code: "review_required", target: "staging", requestDocumentId: first.id },
	]);
	const reviewed = await reviewTarget(context, {
		id: changed.id,
		requestDocumentId: first.id,
		target: "staging",
		revision: changed.revision,
		targetVersionId: first.targets[0]?.versionId ?? null,
		reviewed: true,
		user: reviewer,
	});
	assert(!reviewed.error, JSON.stringify(reviewed.error));
	await approveRequest(changed.id);
	assert(second.versionId);
	expect(
		(
			await updateVersion(context, {
				collectionKey: second.collectionKey,
				documentId: second.documentId,
				versionId: second.versionId,
				userId: creator.id,
				authUser: creator,
				fields: [
					{ key: "title", type: "text", value: "Edited second proposal" },
				],
			})
		).error,
	).toBeUndefined();
	expect((await readRequest(changed.id)).approved).toBe(false);
});

test("mixed-collection access and publishing permissions cover every member", async () => {
	const pageId = await createDocument();
	const articleId = await createDocument("request_articles");
	const created = await createSingle(context, {
		title: "Restricted launch",
		user: creator,
		documents: [
			{
				collectionKey: "request_pages",
				documentId: pageId,
				source: "latest",
				targets: ["staging"],
			},
			{
				collectionKey: "request_articles",
				documentId: articleId,
				source: "latest",
				targets: ["staging"],
			},
		],
	});
	assert(created.data, JSON.stringify(created.error));
	const pagesOnly: LucidUser = {
		...reviewer,
		superAdmin: false,
		permissions: [
			Permissions.RequestsRead,
			getCollectionPermission("request_pages", "read"),
		],
	};
	expect(
		(await getSingle(context, { id: created.data.id, user: pagesOnly })).error
			?.status,
	).toBe(404);
	const listed = await getMultiple(context, {
		user: pagesOnly,
		query: { page: 1, perPage: 100 },
	});
	assert(listed.data, JSON.stringify(listed.error));
	expect(
		listed.data.data.some((request) => request.id === created.data.id),
	).toBe(false);
	const publisher: LucidUser = {
		...reviewer,
		superAdmin: false,
		permissions: [
			Permissions.RequestsRead,
			getCollectionPermission("request_pages", "read"),
			getCollectionPermission("request_articles", "read"),
			getCollectionPermission("request_pages", "publish"),
		],
	};
	await approveRequest(created.data.id);
	expect(
		(await complete(context, { id: created.data.id, user: publisher })).error
			?.status,
	).toBe(403);
});

test("one scheduled job publishes mixed proposals and snapshots for the group", async () => {
	const pageId = await createDocument();
	const articleId = await createDocument("request_articles");
	await completeNow(
		await createRequest(articleId, ["staging"], "latest", "request_articles"),
	);
	const created = await createSingle(context, {
		title: "Scheduled group",
		user: creator,
		documents: [
			{
				collectionKey: "request_pages",
				documentId: pageId,
				source: "latest",
				targets: ["staging"],
			},
			{
				collectionKey: "request_articles",
				documentId: articleId,
				source: "staging",
				targets: ["production"],
			},
		],
	});
	assert(created.data, JSON.stringify(created.error));
	expect(
		(await readRequest(created.data.id)).documents
			.map((document) => document.source)
			.sort(),
	).toEqual(["latest", "staging"]);
	const { revision } = await approveRequest(created.data.id);
	const Requests = new RequestsRepository(context.db);
	expect(
		(
			await Requests.updateSingle({
				data: {
					scheduled_by: creator.id,
					scheduled_at: new Date().toISOString(),
					execution_job_id: "group-job",
				},
				where: [{ key: "id", operator: "=", value: created.data.id }],
			})
		).error,
	).toBeUndefined();
	const job = { id: created.data.id, revision, userId: creator.id };
	expect(
		(await execute(context, { ...job, jobId: "stale-job" })).error,
	).toBeUndefined();
	expect((await readRequest(created.data.id)).status).toBe("open");
	expect(
		(await execute(context, { ...job, jobId: "group-job" })).error,
	).toBeUndefined();
	expect((await readRequest(created.data.id)).status).toBe("completed");
	expect(await fieldOf(pageId, "summary", "staging")).toBe("Original");
	expect(
		await fieldOf(
			articleId,
			"summary",
			"production",
			undefined,
			"request_articles",
		),
	).toBe("Original");
});

const requestDocument = async (user: LucidUser, title = "Requested") => {
	const requested = await requestCreation(context, {
		collectionKey: "create_request_pages",
		title: "New page",
		fields: [
			{ key: "title", type: "text", value: title },
			{ key: "summary", type: "text", value: "Draft" },
		],
		user,
	});
	assert(requested.data, JSON.stringify(requested.error));
	return requested.data;
};
const listRequestPages = async (pending: boolean) => {
	const listed = await getDocuments(context, {
		collectionKey: "create_request_pages",
		version: "latest",
		query: {
			filter: { pending: { value: pending } },
			page: 1,
			perPage: 100,
		},
		user: creator,
	});
	assert(listed.data, JSON.stringify(listed.error));
	return listed.data.documents.map((document) => document.id);
};

test("requested documents only exist as their create request's proposal until completed", async () => {
	const before = await getOverview(context, { user: creator });
	assert(before.data, JSON.stringify(before.error));
	const requested = await requestDocument(creator);
	const after = await getOverview(context, { user: creator });
	assert(after.data, JSON.stringify(after.error));
	expect(after.data.create.awaitingApproval).toBe(
		before.data.create.awaitingApproval + 1,
	);
	expect(after.data.publish).toEqual(before.data.publish);
	const request = await readRequest(requested.requestId);
	expect(request.type).toBe("create");
	expect(member(request).documentId).toBe(requested.id);
	expect(member(request).targets.map((target) => target.target)).toEqual([
		"latest",
	]);
	//* the initial stage doesn't target latest
	expect(request.blockers).toEqual([
		{
			code: "workflow",
			target: "latest",
			requestDocumentId: member(request).id,
		},
	]);

	expect(await listRequestPages(false)).not.toContain(requested.id);
	expect(await listRequestPages(true)).toContain(requested.id);
	const pagesReader: LucidUser = {
		...reviewer,
		superAdmin: false,
		permissions: [getCollectionPermission("create_request_pages", "read")],
	};
	expect(
		(
			await getDocuments(context, {
				collectionKey: "create_request_pages",
				version: "latest",
				query: { filter: { pending: { value: true } }, page: 1, perPage: 10 },
				user: pagesReader,
			})
		).error?.status,
	).toBe(403);
	expect(
		(
			await getDocument(context, {
				collectionKey: "create_request_pages",
				id: requested.id,
				version: "latest",
				query: {},
				authUser: creator,
			})
		).error?.status,
	).toBe(404);

	const direct = await upsertSingle(context, {
		collectionKey: "create_request_pages",
		userId: creator.id,
		fields: [{ key: "title", type: "text", value: "Direct" }],
	});
	expect(direct.error?.status).toBe(403);

	const relating = await requestCreation(context, {
		collectionKey: "create_request_pages",
		title: "Related page",
		fields: [
			{ key: "title", type: "text", value: "Relating" },
			{
				key: "related",
				type: "relation",
				value: [{ id: requested.id, collectionKey: "create_request_pages" }],
			},
		],
		user: creator,
	});
	expect(relating.error).toMatchObject({
		status: 400,
		errors: { fields: [{ key: "related" }] },
	});

	expect(
		(
			await addDocuments(context, {
				id: request.id,
				documents: [
					{
						collectionKey: "request_pages",
						documentId: await createDocument(),
						source: "latest",
						targets: ["staging"],
					},
				],
				user: creator,
			})
		).error?.status,
	).toBe(400);
	expect(
		(
			await updateTargets(context, {
				id: request.id,
				requestDocumentId: member(request).id,
				targets: ["staging"],
				user: creator,
			})
		).error?.status,
	).toBe(400);
});

test("create requests are edited, approved and completed with create access, and requesters keep their own", async () => {
	const read = [
		Permissions.RequestsRead,
		getCollectionPermission("create_request_pages", "read"),
	];
	const requester: LucidUser = {
		...creator,
		superAdmin: false,
		permissions: [
			...read,
			getCollectionPermission("create_request_pages", "create-request"),
		],
	};
	const requested = await requestDocument(requester);
	const asRequester = await getSingle(context, {
		id: requested.requestId,
		user: requester,
	});
	assert(asRequester.data, JSON.stringify(asRequester.error));
	expect(asRequester.data.permissions).toEqual({
		edit: true,
		approve: false,
		request: false,
		reopen: false,
	});
	expect(member(asRequester.data).permissions.edit).toBe(true);

	const edited = await updateVersion(context, {
		collectionKey: "create_request_pages",
		documentId: requested.id,
		versionId: versionOf(asRequester.data),
		userId: requester.id,
		authUser: requester,
		fields: [
			{ key: "title", type: "text", value: "Requested" },
			{ key: "summary", type: "text", value: "Edited" },
		],
	});
	assert(!edited.error, JSON.stringify(edited.error));
	const otherRequester = { ...requester, id: reviewer.id };
	expect(
		(
			await updateVersion(context, {
				collectionKey: "create_request_pages",
				documentId: requested.id,
				versionId: versionOf(asRequester.data),
				userId: otherRequester.id,
				authUser: otherRequester,
				fields: [{ key: "title", type: "text", value: "Taken over" }],
			})
		).error?.status,
	).toBe(403);

	const latestId = await createDocument();
	const latest = await readVersionContent(context, {
		collectionKey: "request_pages",
		documentId: latestId,
		versionType: "latest",
	});
	assert(latest.data);
	expect(
		(
			await updateVersion(context, {
				collectionKey: "request_pages",
				documentId: latestId,
				versionId: latest.data.id,
				userId: requester.id,
				authUser: requester,
				fields: [{ key: "title", type: "text", value: "Not allowed" }],
			})
		).error?.status,
	).toBe(403);

	assert(
		!(await close(context, { id: requested.requestId, user: requester })).error,
	);
	assert(
		!(await reopen(context, { id: requested.requestId, user: requester }))
			.error,
	);

	const ready = await updateWorkflow(context, {
		collectionKey: "create_request_pages",
		documentId: requested.id,
		versionId: versionOf(asRequester.data),
		stage: "ready",
		user: creator,
	});
	assert(!ready.error, JSON.stringify(ready.error));

	const updater: LucidUser = {
		...reviewer,
		superAdmin: false,
		permissions: [
			...read,
			getCollectionPermission("create_request_pages", "update"),
			getCollectionPermission("create_request_pages", "review"),
			getCollectionPermission("create_request_pages", "publish"),
		],
	};
	const creatorAccess: LucidUser = {
		...updater,
		permissions: [
			...read,
			getCollectionPermission("create_request_pages", "create"),
			getCollectionPermission("create_request_pages", "review"),
		],
	};
	const asUpdater = await getSingle(context, {
		id: requested.requestId,
		user: updater,
	});
	assert(asUpdater.data, JSON.stringify(asUpdater.error));
	expect(asUpdater.data.permissions).toMatchObject({
		edit: false,
		approve: false,
		request: false,
	});
	const asCreator = await getSingle(context, {
		id: requested.requestId,
		user: creatorAccess,
	});
	assert(asCreator.data, JSON.stringify(asCreator.error));
	expect(asCreator.data.permissions).toMatchObject({
		edit: true,
		approve: true,
		request: true,
	});

	const approved = await approve(context, {
		...reviewInput(asCreator.data),
		user: creatorAccess,
	});
	assert(!approved.error, JSON.stringify(approved.error));
	expect(
		(await complete(context, { id: requested.requestId, user: updater })).error
			?.status,
	).toBe(403);
	const completed = await completeRequest(requested.requestId, creatorAccess);
	expect(completed.status).toBe("completed");
});

test("completing a create request creates the document in latest with its approved workflow", async () => {
	const requested = await requestDocument(creator, "Landing");
	const request = await readRequest(requested.requestId);
	const moved = await updateWorkflow(context, {
		collectionKey: "create_request_pages",
		documentId: requested.id,
		versionId: versionOf(request),
		stage: "ready",
		assigneeIds: [reviewer.id],
		user: creator,
	});
	assert(!moved.error, JSON.stringify(moved.error));

	await approveRequest(request.id);
	const completed = await completeRequest(request.id);
	expect(completed.status).toBe("completed");
	expect(member(completed).versionId).toBeNull();

	expect(await listRequestPages(false)).toContain(requested.id);
	expect(await listRequestPages(true)).not.toContain(requested.id);
	expect(
		await fieldOf(
			requested.id,
			"title",
			"latest",
			undefined,
			"create_request_pages",
		),
	).toBe("Landing");
	const created = await getDocument(context, {
		collectionKey: "create_request_pages",
		id: requested.id,
		version: "latest",
		query: {},
		authUser: creator,
	});
	assert(created.data, JSON.stringify(created.error));
	expect(created.data.document.createRequestId).toBeNull();
	expect(created.data.document.createdBy).toBe(creator.id);
	const workflow = await getWorkflow(context, {
		collectionKey: "create_request_pages",
		documentId: requested.id,
		versionId: null,
	});
	expect(workflow.data?.stage).toBe("ready");
	expect(workflow.data?.assignees.map((assignee) => assignee.userId)).toEqual([
		reviewer.id,
	]);
});

test("requests need every approval their collections ask for, and withdrawing keeps the others", async () => {
	const id = await createDocument("approval_pages");
	const request = await createRequest(
		id,
		["staging"],
		"latest",
		"approval_pages",
	);
	expect(request.requiredApprovals).toBe(2);

	const first = await approveRequest(request.id);
	expect(first.approved).toBe(false);
	expect(first.approvals.map((approval) => approval.user?.id)).toEqual([
		reviewer.id,
	]);
	expect(member(first).approvedVersionId).toBeNull();
	expect(
		(await approve(context, { ...reviewInput(first), user: reviewer })).error
			?.status,
	).toBe(409);

	const second = await approveRequest(request.id, secondReviewer);
	expect(second.approved).toBe(true);
	expect(member(second).approvedVersionId).not.toBeNull();

	assert(!(await unapprove(context, { id: request.id, user: reviewer })).error);
	const withdrawn = await readRequest(request.id);
	expect(withdrawn.approved).toBe(false);
	expect(withdrawn.approvals.map((approval) => approval.user?.id)).toEqual([
		secondReviewer.id,
	]);
	expect(
		(await unapprove(context, { id: request.id, user: reviewer })).error
			?.status,
	).toBe(409);

	const reapproved = await approveRequest(request.id);
	expect(reapproved.approved).toBe(true);
	const completed = await completeRequest(request.id);
	expect(completed.status).toBe("completed");
});

test("edits clear partial approvals, and mixed requests need the most approvals", async () => {
	const request = await createRequest(
		await createDocument("approval_pages"),
		["staging"],
		"latest",
		"approval_pages",
	);
	await approveRequest(request.id);
	const edited = await editProposal(request, "Changed");
	expect(edited.approvals).toEqual([]);
	expect(edited.events.map((event) => event.type)).toContain(
		"approval_dismissed",
	);

	const mixed = await createSingle(context, {
		title: "Mixed",
		documents: [
			{
				collectionKey: "request_pages",
				documentId: await createDocument(),
				source: "latest",
				targets: ["staging"],
			},
			{
				collectionKey: "approval_pages",
				documentId: await createDocument("approval_pages"),
				source: "latest",
				targets: ["staging"],
			},
		],
		user: creator,
	});
	assert(mixed.data, JSON.stringify(mixed.error));
	expect((await readRequest(mixed.data.id)).requiredApprovals).toBe(2);
});

test("content changes move a stage with resetTo back, for latest and proposals", async () => {
	const id = await createDocument("reset_pages");
	const moveLatest = async (stage: string) => {
		const moved = await updateWorkflow(context, {
			collectionKey: "reset_pages",
			documentId: id,
			stage,
			user: creator,
		});
		assert(!moved.error, JSON.stringify(moved.error));
	};
	const latestStage = async () =>
		(
			await getWorkflow(context, {
				collectionKey: "reset_pages",
				documentId: id,
				versionId: null,
			})
		).data?.stage;

	await moveLatest("ready");
	await editLatest(id, "Changed", "reset_pages");
	expect(await latestStage()).toBe("review");
	await editLatest(id, "Changed again", "reset_pages");
	expect(await latestStage()).toBe("review");

	const request = await createRequest(id, ["staging"], "latest", "reset_pages");
	const moved = await updateWorkflow(context, {
		collectionKey: "reset_pages",
		documentId: id,
		versionId: versionOf(request),
		stage: "ready",
		user: creator,
	});
	assert(!moved.error, JSON.stringify(moved.error));
	const edited = await editProposal(request, "Proposal");
	expect(member(edited).workflowStage).toBe("review");
	expect(edited.events.at(-1)).toMatchObject({
		type: "workflow_updated",
		stage: "review",
	});
});

test("collection request checks only see their own collection's documents", async () => {
	const created = await createSingle(context, {
		title: "Checked",
		documents: [
			{
				collectionKey: "request_pages",
				documentId: await createDocument(),
				source: "latest",
				targets: ["staging"],
			},
			{
				collectionKey: "checked_pages",
				documentId: await createDocument("checked_pages"),
				source: "latest",
				targets: ["staging"],
			},
		],
		user: creator,
	});
	assert(created.data, JSON.stringify(created.error));
	const request = await readRequest(created.data.id);
	const checked = request.documents.find(
		(document) => document.collectionKey === "checked_pages",
	);
	assert(checked);
	expect(request.blockers).toEqual([
		{
			code: "check",
			requestDocumentId: checked.id,
			message: "Checked checked_pages",
		},
	]);
});

test("create requests aren't gated by stages unless the collection requires create requests", async () => {
	const requested = await requestCreation(context, {
		collectionKey: "workflow_pages",
		title: "New page",
		fields: [{ key: "title", type: "text", value: "Requested" }],
		user: creator,
	});
	assert(requested.data, JSON.stringify(requested.error));
	const request = await readRequest(requested.data.requestId);
	expect(member(request).workflowStage).toBeNull();
	expect(request.blockers).toEqual([]);
});

test("an earlier approval approves the request once its collections need fewer", async () => {
	const request = await createRequest(
		await createDocument("approval_pages"),
		["staging"],
		"latest",
		"approval_pages",
	);
	await approveRequest(request.id);

	const lowered: ServiceContext = {
		...context,
		config: {
			...context.config,
			collections: context.config.collections.map((collection) =>
				collection.key === "approval_pages"
					? new CollectionBuilder("approval_pages", {
							details: { labels: { singular: "Page", plural: "Pages" } },
							mode: "multiple",
							publishing: {
								review: { targets: ["staging"] },
								targets: [{ key: "staging", label: "Staging" }],
							},
						})
							.addText("title")
							.addText("summary")
					: collection,
			),
		},
	};
	const approved = await approve(lowered, {
		...reviewInput(await readRequest(request.id)),
		user: reviewer,
	});
	assert(!approved.error, JSON.stringify(approved.error));
	const read = await getSingle(lowered, { id: request.id, user: creator });
	assert(read.data, JSON.stringify(read.error));
	expect(read.data.approved).toBe(true);
	expect(read.data.approvals).toHaveLength(1);
});
