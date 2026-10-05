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
import { ReleasesRepository } from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { Release } from "../../types/response.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import type { ServiceContext } from "../../utils/services/types.js";
import { createTestQueueAdapter } from "../../utils/test-helpers/create-jobs-context.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import getWorkflow from "../document-workflows/get-single.js";
import updateWorkflow from "../document-workflows/update-single.js";
import getDocument from "../documents/get-single.js";
import upsertSingle from "../documents/upsert-single.js";
import align from "../documents-versions/align.js";
import readVersionContent from "../documents-versions/helpers/read-version-content.js";
import updateVersion from "../documents-versions/update-single.js";
import syncCollections from "../sync/sync-collections.js";
import addDocuments from "./add-documents.js";
import approve from "./approve.js";
import close from "./close.js";
import createComment from "./create-comment.js";
import createSingle from "./create-single.js";
import deleteComment from "./delete-comment.js";
import execute from "./execute.js";
import getExecution from "./get-execution.js";
import getMultiple from "./get-multiple.js";
import getSingle from "./get-single.js";
import ReleaseExecutionError from "./helpers/execution-error.js";
import scheduleRelease from "./helpers/schedule-release.js";
import { executeReleaseJob } from "./jobs/execute.js";
import publish from "./publish.js";
import removeDocument from "./remove-document.js";
import reopen from "./reopen.js";
import reviewTarget from "./review-target.js";
import updateCommentResolution from "./update-comment-resolution.js";
import updateSingle from "./update-single.js";
import updateTargets from "./update-targets.js";

const fixture = getTestConfig();
const collections = [
	...["release_pages", "release_articles"].map((key) =>
		new CollectionBuilder(key, {
			mode: "multiple",
			revisions: { enabled: true },
			details: { labels: { singular: "Page", plural: "Pages" } },
			publishing: {
				scheduling: true,
				review: { requiredFor: ["production"], allowSelfApproval: false },
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
					{ key: "draft", label: "Draft", publishTargets: [] },
					{
						key: "ready",
						label: "Ready",
						publishTargets: ["staging", "production"],
					},
				],
			},
		},
	})
		.addText("title")
		.addText("summary"),
];
let context: ServiceContext;
let creator: LucidUser;
let reviewer: LucidUser;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: {
			...config,
			collections,
			jobs: {
				...config.jobs,
				definitions: config.jobs.definitions.map((job) =>
					job.name === executeReleaseJob.name ? executeReleaseJob : job,
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
});
afterAll(async () => {
	await fixture.destroy();
});

const createDocument = async (
	key = "release_pages",
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
	key = "release_pages",
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
const readRelease = async (id: number) => {
	const read = await getSingle(context, { id, user: creator });
	assert(read.data, JSON.stringify(read.error));
	return read.data;
};
const member = (release: Release) => {
	const document = release.documents[0];
	assert(document);
	return document;
};
/** The release's own proposal or snapshot version. */
const versionOf = (release: Release) => {
	const versionId = member(release).versionId;
	assert(versionId);
	return versionId;
};
const createRelease = async (
	documentId: number,
	targets: string[] = ["staging"],
	source = "latest",
	collectionKey = "release_pages",
): Promise<Release> => {
	const created = await createSingle(context, {
		title: "Spring launch",
		documents: [{ collectionKey, documentId, source, targets }],
		user: creator,
	});
	assert(created.data, JSON.stringify(created.error));
	return readRelease(created.data.id);
};
const reviewInput = (release: Release) => ({
	id: release.id,
	revision: release.revision,
	expectedTargets: Object.fromEntries(
		release.documents.map((document) => [
			document.id,
			Object.fromEntries(
				document.targets.map((target) => [target.target, target.versionId]),
			),
		]),
	),
});
const approveRelease = async (id: number) => {
	const approved = await approve(context, {
		...reviewInput(await readRelease(id)),
		user: reviewer,
	});
	assert(!approved.error, JSON.stringify(approved.error));
	return readRelease(id);
};
const publishRelease = async (id: number, user = creator) => {
	const queued = await publish(context, { id, user });
	assert(queued.data, JSON.stringify(queued.error));
	expect(await consumeJob(context, queued.data)).toEqual({ type: "completed" });
	return readRelease(id);
};
const editProposal = async (
	release: Release,
	summary: string,
	title = "Source",
) => {
	const updated = await updateVersion(context, {
		collectionKey: member(release).collectionKey,
		documentId: member(release).documentId,
		versionId: versionOf(release),
		userId: creator.id,
		authUser: creator,
		fields: [
			{ key: "title", type: "text", value: title },
			{ key: "summary", type: "text", value: summary },
		],
	});
	assert(updated.data, JSON.stringify(updated.error));
	return readRelease(release.id);
};
const fieldOf = async (
	documentId: number,
	fieldKey: string,
	versionType: string,
	versionId?: number,
	collectionKey = "release_pages",
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

test("scheduled dispatch commits the release link before notifying a consumer", async () => {
	const release = await createRelease(await createDocument());
	await approveRelease(release.id);
	await context.db.kysely
		.updateTable("lucid_releases")
		.set({ scheduled_at: new Date().toISOString(), scheduled_by: creator.id })
		.where("id", "=", release.id)
		.execute();
	let deliveries = 0;
	const queue = createTestQueueAdapter(async (context, messages) => {
		for (const message of messages) {
			const linked = await context.db.kysely
				.selectFrom("lucid_releases")
				.select("execution_job_id")
				.where("id", "=", release.id)
				.executeTakeFirstOrThrow();
			expect(linked.execution_job_id).toBe(message.jobId);
			deliveries++;
		}
		return { error: undefined, data: undefined };
	});
	expect(
		(
			await serviceWrapper(scheduleRelease, { transaction: true })(
				{ ...context, queue },
				{ id: release.id },
			)
		).error,
	).toBeUndefined();
	expect(deliveries).toBe(1);
});

test("manual publication replaces a future schedule and its old delivery cannot publish", async () => {
	const documentId = await createDocument();
	const release = await createRelease(documentId);
	await approveRelease(release.id);
	const scheduled = await updateSingle(context, {
		id: release.id,
		user: creator,
		scheduledAt: new Date(Date.now() + 60_000).toISOString(),
		scheduledTimezone: "UTC",
	});
	assert(!scheduled.error, JSON.stringify(scheduled.error));
	const previous = (await readRelease(release.id)).executionJobId;
	assert(previous);
	const queued = await publish(context, {
		id: release.id,
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
	const release = await createRelease(await createDocument(), [
		"staging",
		"production",
	]);
	const approved = await approveRelease(release.id);
	const queued = await publish(context, {
		id: release.id,
		user: creator,
	});
	assert(queued.data);
	await context.db.kysely
		.updateTable("lucid_jobs")
		.set({ status: "failed", error_message: "Production is frozen" })
		.where("job_id", "=", queued.data.jobId)
		.execute();
	expect(
		(await getExecution(context, { id: release.id, user: creator })).data
			?.status,
	).toBe("failed");
	expect((await readRelease(release.id)).failureReleaseDocumentId).toBeNull();
	const hook = getJobDefinitionRuntime(executeReleaseJob).onPermanentFailure;
	assert(hook);
	const failure = {
		jobId: queued.data.jobId,
		input: {
			releaseId: release.id,
			revision: approved.revision,
			userId: creator.id,
		},
		attempts: 1,
		errorMessage: "Production is frozen",
		error: {
			cause: new ReleaseExecutionError(member(approved).id, "production"),
		},
	};
	await hook(context, failure);
	await hook(context, failure);
	const detail = await readRelease(release.id);
	expect(detail).toMatchObject({
		failureReleaseDocumentId: member(approved).id,
		failureTarget: "production",
	});
	expect(detail.events.filter((event) => event.type === "failed")).toHaveLength(
		1,
	);
});

test("manual publication returns a reusable job receipt and commits with job completion", async () => {
	const documentId = await createDocument();
	const release = await createRelease(documentId);
	await approveRelease(release.id);
	const queued = await publish(context, {
		id: release.id,
		user: creator,
	});
	assert(queued.data, JSON.stringify(queued.error));
	expect(
		(await publish(context, { id: release.id, user: creator })).data,
	).toEqual(queued.data);
	expect(
		(await getExecution(context, { id: release.id, user: creator })).data,
	).toMatchObject({ jobId: queued.data.jobId, status: "queued" });
	expect((await readRelease(release.id)).status).toBe("open");
	expect(await fieldOf(documentId, "summary", "staging")).toBeNull();
	expect(await consumeJob(context, queued.data)).toEqual({ type: "completed" });
	expect(
		(await getExecution(context, { id: release.id, user: creator })).data
			?.status,
	).toBe("completed");
	expect(await fieldOf(documentId, "summary", "staging")).toBe("Original");
	expect((await readRelease(release.id)).executionJobId).toBe(
		queued.data.jobId,
	);
	expect(await consumeJob(context, queued.data)).toEqual({ type: "ignored" });
	expect(
		(await readRelease(release.id)).events.filter(
			(event) => event.type === "released",
		),
	).toHaveLength(1);
});

test("editing a queued proposal invalidates its job and approval", async () => {
	const documentId = await createDocument();
	const release = await createRelease(documentId);
	await approveRelease(release.id);
	const queued = await publish(context, {
		id: release.id,
		user: creator,
	});
	assert(queued.data);
	const edited = await editProposal(release, "New proposal");
	expect(edited.executionJobId).toBeNull();
	expect(await consumeJob(context, queued.data)).toEqual({ type: "completed" });
	expect(
		(await getExecution(context, { id: release.id, user: creator })).data,
	).toBeNull();
	expect(await fieldOf(documentId, "summary", "staging")).toBeNull();
	expect((await readRelease(release.id)).approved).toBe(false);
});

test("queued publication rechecks whether its actor is still allowed to publish", async () => {
	const documentId = await createDocument();
	const release = await createRelease(documentId);
	await approveRelease(release.id);
	const queued = await publish(context, {
		id: release.id,
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
		expect((await readRelease(release.id)).status).toBe("open");
		expect((await readRelease(release.id)).failure).not.toBeNull();
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
	const release = await createRelease(documentId, ["staging", "production"]);
	const approved = await approveRelease(release.id);
	const queued = await publish(context, {
		id: release.id,
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
	const failed = await readRelease(release.id);
	expect(failed).toMatchObject({
		status: "open",
		approved: true,
		failure: "Production is frozen",
		failureReleaseDocumentId: member(approved).id,
		failureTarget: "production",
	});
	expect(await fieldOf(documentId, "summary", "staging")).toBeNull();
	expect(await fieldOf(documentId, "summary", "production")).toBeNull();
	const retry = await publish(context, {
		id: release.id,
		user: creator,
	});
	assert(retry.data);
	expect(retry.data.jobId).not.toBe(queued.data.jobId);
	expect(await consumeJob(context, retry.data)).toEqual({ type: "completed" });
	expect((await readRelease(release.id)).failure).toBeNull();
});

test("worker recovery and polling reconcile terminal release failures once", async () => {
	const documentId = await createDocument();
	const release = await createRelease(documentId);
	await approveRelease(release.id);
	const queued = await publish(context, {
		id: release.id,
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
	expect((await readRelease(release.id)).failure).not.toBeNull();
	// Simulate interruption between the job's failed write and its failure hook.
	await context.db.kysely
		.updateTable("lucid_releases")
		.set({ failure: null })
		.where("id", "=", release.id)
		.execute();
	const before = (await readRelease(release.id)).events.filter(
		(event) => event.type === "failed",
	).length;
	expect(
		(await getExecution(context, { id: release.id, user: creator })).data
			?.status,
	).toBe("failed");
	expect(
		(await readRelease(release.id)).events.filter(
			(event) => event.type === "failed",
		),
	).toHaveLength(before);
});

test("execution polling uses release collection permissions", async () => {
	const release = await createRelease(await createDocument());
	const unreadable: LucidUser = {
		...creator,
		superAdmin: false,
		permissions: [Permissions.ReleasesRead],
	};
	expect(
		(await getExecution(context, { id: release.id, user: unreadable })).error
			?.status,
	).toBe(404);
	expect(
		(await getExecution(context, { id: release.id, user: creator })).data,
	).toBeNull();
});

test("releases hold at most 100 documents", async () => {
	const created = await createSingle(context, {
		title: "Too many",
		user: creator,
		documents: Array.from({ length: 101 }, (_, index) => ({
			collectionKey: "release_pages",
			documentId: 1_000_000 + index,
			source: "latest",
			targets: ["staging"],
		})),
	});
	expect(created.error?.status).toBe(413);
});
const releaseNow = async (release: Release) => {
	await approveRelease(release.id);
	return publishRelease(release.id);
};
const acknowledge = async (
	release: Release,
	target: string,
	reviewed = true,
) => {
	const current = await readRelease(release.id);
	const destination = member(current).targets.find(
		(item) => item.target === target,
	);
	assert(destination);
	const result = await reviewTarget(context, {
		id: current.id,
		releaseDocumentId: member(current).id,
		revision: current.revision,
		target,
		targetVersionId: destination.versionId,
		reviewed,
		user: reviewer,
	});
	assert(!result.error, JSON.stringify(result.error));
	return readRelease(release.id);
};
const alignContent = async (
	release: Release,
	source: string,
	/** Defaults to the proposal's current content. */
	destinationContentId?: string,
) => {
	const document = member(release);
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
	const release = await createRelease(id, ["staging", "production"]);
	expect(member(release).source).toBe("latest");
	expect(release.blockers).toEqual([]);
	await editProposal(release, "Proposed");
	expect(await fieldOf(id, "summary", "latest")).toBe("Original");
	expect(
		await fieldOf(
			id,
			"summary",
			"proposal",
			member(release).versionId ?? undefined,
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
						{ collectionKey: "release_pages", documentId: id, ...input },
					],
					user: creator,
				})
			).error?.status,
		).toBe(400);
	}
});

test("proposal releases replace selected environments and leave latest untouched", async () => {
	const id = await createDocument();
	const release = await createRelease(id, ["staging", "production"]);
	await editProposal(release, "Reviewed proposal");
	const approved = await approveRelease(release.id);
	expect((await readRelease(release.id)).approved).toBe(true);
	const released = await publishRelease(release.id);
	expect(released.status).toBe("released");
	expect(member(released).approvedVersionId).toBe(
		member(approved).approvedVersionId,
	);
	//* the approved snapshot holds the proposal's content, so the proposal is removed
	expect(member(released).versionId).toBeNull();
	expect(member(released).documentLabel).toBe(member(approved).documentLabel);
	expect(await fieldOf(id, "summary", "latest")).toBe("Original");
	expect(await fieldOf(id, "summary", "staging")).toBe("Reviewed proposal");
	expect(await fieldOf(id, "summary", "production")).toBe("Reviewed proposal");
});

test("parallel proposals and later latest edits remain independent during publication", async () => {
	const id = await createDocument();
	const first = await createRelease(id);
	const second = await createRelease(id);
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
	await releaseNow(first);
	const changed = await readRelease(second.id);
	expect(member(changed).targets).toMatchObject([
		{ target: "staging", changedSinceCreation: true, reviewed: false },
	]);
	expect(changed.blockers).toContainEqual({
		releaseDocumentId: member(changed).id,
		code: "review_required",
		target: "staging",
	});
	await acknowledge(changed, "staging");
	await releaseNow(second);
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
			member(await readRelease(first.id)).approvedVersionId ?? undefined,
		),
	).toBe("First summary");
});

test("acknowledgement holds for the target version, survives proposal edits and rejects stale review", async () => {
	const id = await createDocument();
	await releaseNow(await createRelease(id));
	const first = await createRelease(id);
	const second = await createRelease(id);
	await editProposal(first, "First proposal");
	await editProposal(second, "Second proposal");
	await releaseNow(first);
	const changed = await readRelease(second.id);
	expect(
		(await approve(context, { ...reviewInput(changed), user: reviewer })).error
			?.status,
	).toBe(409);
	const stale = {
		id: changed.id,
		releaseDocumentId: member(changed).id,
		revision: changed.revision,
		target: "staging",
		targetVersionId: member(changed).targets[0]?.versionId ?? null,
		reviewed: true,
		user: reviewer,
	};
	await acknowledge(changed, "staging");
	await approveRelease(second.id);
	await acknowledge(changed, "staging", false);
	const withdrawn = await readRelease(second.id);
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
	await approveRelease(second.id);
	const third = await createRelease(id);
	await editProposal(third, "Third proposal");
	await releaseNow(third);
	const republished = await readRelease(second.id);
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
		(await publish(context, { id: second.id, user: creator })).error?.status,
	).toBe(409);
	await acknowledge(republished, "staging");
	await releaseNow(second);
	expect(await fieldOf(id, "summary", "staging")).toBe("Revised proposal");
	expect(await fieldOf(id, "summary", "latest")).toBe("Original");
});

test("a release closed while its target is published asks for review once reopened", async () => {
	const id = await createDocument();
	const release = await createRelease(id);
	expect(
		(await close(context, { id: release.id, user: creator })).error,
	).toBeUndefined();
	const publisher = await createRelease(id);
	await editProposal(publisher, "Published while closed");
	await releaseNow(publisher);
	expect(
		(await reopen(context, { id: release.id, user: creator })).error,
	).toBeUndefined();
	expect((await readRelease(release.id)).blockers).toContainEqual({
		releaseDocumentId: member(release).id,
		code: "review_required",
		target: "staging",
	});
});

test("anyone who can read a release and edit its document can acknowledge a changed target", async () => {
	const id = await createDocument();
	const release = await createRelease(id);
	await releaseNow(await createRelease(id));
	const changed = await readRelease(release.id);
	const input = {
		id: changed.id,
		releaseDocumentId: member(changed).id,
		revision: changed.revision,
		target: "staging",
		targetVersionId: member(changed).targets[0]?.versionId ?? null,
		reviewed: true,
	};
	const readOnly: LucidUser = {
		...creator,
		superAdmin: false,
		permissions: [
			Permissions.ReleasesRead,
			getCollectionPermission("release_pages", "read"),
		],
	};
	expect(
		(await reviewTarget(context, { ...input, user: readOnly })).error?.status,
	).toBe(403);
	const editor: LucidUser = {
		...readOnly,
		permissions: [
			...(readOnly.permissions ?? []),
			getCollectionPermission("release_pages", "update"),
		],
	};
	expect(
		(await reviewTarget(context, { ...input, user: editor })).error,
	).toBeUndefined();
	expect(member(await readRelease(release.id)).targets[0]).toMatchObject({
		reviewed: true,
	});
});

test("publishing records activity on other open releases, including targets added later", async () => {
	const id = await createDocument();
	const release = await createRelease(id, ["production"]);
	const publisher = await createRelease(id);
	await editProposal(publisher, "Published elsewhere");
	await releaseNow(publisher);
	expect(
		(await readRelease(publisher.id)).events.some(
			(event) => event.type === "target_published",
		),
	).toBe(false);
	const recorded = await readRelease(release.id);
	expect(recorded.events).toContainEqual(
		expect.objectContaining({ type: "target_published", target: "staging" }),
	);
	expect(member(recorded).targets).toMatchObject([
		{ target: "production", changedSinceCreation: false },
	]);
	const readded = await updateTargets(context, {
		id: release.id,
		releaseDocumentId: member(release).id,
		targets: ["staging", "production"],
		user: creator,
	});
	assert(!readded.error, JSON.stringify(readded.error));
	const retargeted = await readRelease(release.id);
	expect(
		member(retargeted).targets.find((target) => target.target === "staging"),
	).toMatchObject({ changedSinceCreation: true, reviewed: false });
	expect((await alignContent(retargeted, "staging")).error).toBeUndefined();
	expect(
		(await readRelease(release.id)).blockers.some(
			(blocker) => blocker.code === "review_required",
		),
	).toBe(true);
});

test("approval freezes the reviewed proposal, is dismissed when it changes and survives latest edits", async () => {
	const id = await createDocument();
	const release = await createRelease(id);
	const staleReview = reviewInput(release);
	await editProposal(release, "Edited before approval");
	expect(
		(await approve(context, { ...staleReview, user: reviewer })).error?.status,
	).toBe(409);
	const approved = await approveRelease(release.id);
	expect(member(approved).approvedVersionId).not.toBe(
		member(approved).versionId,
	);
	await editProposal(approved, "Edited after approval");
	expect((await readRelease(release.id)).approved).toBe(false);
	expect(
		(await publish(context, { id: release.id, user: creator })).error?.status,
	).toBe(409);
	await approveRelease(release.id);
	await editLatest(id, "Changed latest");
	expect((await readRelease(release.id)).approved).toBe(true);
});

test("environment sources are immutable snapshots, even when the environment advances", async () => {
	const id = await createDocument();
	await releaseNow(await createRelease(id, ["staging"]));
	const release = await createRelease(id, ["production"], "staging");
	expect(member(release).source).toBe("staging");
	const attemptedEdit = await updateVersion(context, {
		collectionKey: member(release).collectionKey,
		documentId: id,
		versionId: versionOf(release),
		userId: creator.id,
		authUser: creator,
		fields: [{ key: "title", type: "text", value: "Changed" }],
	});
	expect(attemptedEdit.error).toBeDefined();
	const next = await createRelease(id, ["staging"]);
	await editProposal(next, "Next staging");
	await releaseNow(next);
	expect(await fieldOf(id, "summary", "snapshot", versionOf(release))).toBe(
		"Original",
	);
	expect((await readRelease(release.id)).blockers).toContainEqual({
		releaseDocumentId: member(release).id,
		code: "prerequisite",
		target: "production",
		required: "staging",
	});
});

test("target changes require new approval while title, reviewer and schedule changes retain it", async () => {
	const id = await createDocument();
	const release = await createRelease(id, ["staging"]);
	const author: LucidUser = {
		...creator,
		superAdmin: false,
		permissions: [
			Permissions.ReleasesRead,
			...(["read", "update", "review"] as const).map((action) =>
				getCollectionPermission("release_pages", action),
			),
		],
	};
	expect(
		(await approve(context, { ...reviewInput(release), user: author })).error
			?.status,
	).toBe(403);
	await approveRelease(release.id);
	const updated = await updateSingle(context, {
		id: release.id,
		user: creator,
		title: "Renamed",
		reviewerIds: [reviewer.id],
		scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
		scheduledTimezone: "Europe/London",
	});
	assert(!updated.error, JSON.stringify(updated.error));
	expect((await readRelease(release.id)).approved).toBe(true);
	const changed = await updateTargets(context, {
		id: release.id,
		releaseDocumentId: member(release).id,
		user: creator,
		targets: ["staging", "production"],
	});
	assert(!changed.error, JSON.stringify(changed.error));
	const retargeted = await readRelease(release.id);
	expect(retargeted.approved).toBe(false);
	expect(member(retargeted).versionId).toBe(member(release).versionId);
});

test("adding and removing reviewers is added to the activity", async () => {
	const release = await createRelease(await createDocument());
	const setReviewerIds = async (reviewerIds: number[]) => {
		const updated = await updateSingle(context, {
			id: release.id,
			user: creator,
			reviewerIds,
		});
		assert(!updated.error, JSON.stringify(updated.error));
	};
	await setReviewerIds([reviewer.id]);
	await setReviewerIds([reviewer.id]);
	await setReviewerIds([]);
	const events = (await readRelease(release.id)).events.flatMap((event) =>
		event.type === "reviewer_added" || event.type === "reviewer_removed"
			? [{ type: event.type, reviewer: event.reviewer?.id }]
			: [],
	);
	expect(events).toEqual([
		{ type: "reviewer_added", reviewer: reviewer.id },
		{ type: "reviewer_removed", reviewer: reviewer.id },
	]);
});

test("comments withdraw approval, and comments from others must be resolved before approving again", async () => {
	const id = await createDocument();
	const release = await createRelease(id);
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
		id: release.id,
		user: creator,
		body,
	});
	assert(!commented.error, JSON.stringify(commented.error));
	const withComment = await readRelease(release.id);
	expect(
		(await approve(context, { ...reviewInput(withComment), user: reviewer }))
			.error?.status,
	).toBe(409);
	const comment = withComment.events.find((event) => event.type === "comment");
	assert(comment);
	const resolved = await updateCommentResolution(context, {
		id: release.id,
		eventId: comment.id,
		user: reviewer,
		resolution: "resolved",
	});
	assert(!resolved.error, JSON.stringify(resolved.error));
	expect((await readRelease(release.id)).openComments).toBe(0);
	await approveRelease(release.id);
	//* the approver's own comment withdraws the approval, but they needn't resolve it
	await createComment(context, { id: release.id, user: reviewer, body });
	expect((await readRelease(release.id)).approved).toBe(false);
	await approveRelease(release.id);
	await createComment(context, { id: release.id, user: creator, body });
	expect((await readRelease(release.id)).approved).toBe(false);
});

test("target, workflow and proposal changes are recorded in the activity", async () => {
	const id = await createDocument();
	const release = await createRelease(id);
	await updateTargets(context, {
		id: release.id,
		releaseDocumentId: member(release).id,
		user: creator,
		targets: ["staging", "production"],
	});
	await editProposal(release, "First edit");
	await editProposal(release, "Second edit");
	const types = (await readRelease(release.id)).events.map(
		(event) => event.type,
	);
	expect(types).toContain("target_added");
	//* consecutive edits by one person are recorded once
	expect(types.filter((type) => type === "proposal_edited")).toHaveLength(1);
});

test("listing and reading enforce the document's collection permission", async () => {
	const id = await createDocument("release_articles");
	const release = await createRelease(
		id,
		["staging"],
		"latest",
		"release_articles",
	);
	const pagesOnly: LucidUser = {
		...reviewer,
		superAdmin: false,
		permissions: [
			Permissions.ReleasesRead,
			getCollectionPermission("release_pages", "read"),
		],
	};
	const listed = await getMultiple(context, {
		user: pagesOnly,
		query: { page: 1, perPage: 100 },
	});
	assert(listed.data, JSON.stringify(listed.error));
	expect(listed.data.data.map((row) => row.id)).not.toContain(release.id);
	expect(
		(await getSingle(context, { id: release.id, user: pagesOnly })).error
			?.status,
	).toBe(404);
});

test("closing preserves proposal and comments, and reopening restores edit access", async () => {
	const id = await createDocument();
	const release = await createRelease(id);
	const body = {
		type: "doc",
		content: [
			{ type: "paragraph", content: [{ type: "text", text: "Ready" }] },
		],
	};
	const commented = await createComment(context, {
		id: release.id,
		user: creator,
		body,
	});
	assert(!commented.error, JSON.stringify(commented.error));
	const comment = (await readRelease(release.id)).events.find(
		(event) => event.type === "comment",
	);
	assert(comment);
	expect(
		(
			await deleteComment(context, {
				id: release.id,
				eventId: comment.id,
				user: reviewer,
			})
		).error?.status,
	).toBe(404);
	const closeRes = await close(context, { id: release.id, user: creator });
	assert(!closeRes.error, JSON.stringify(closeRes.error));
	const closed = await readRelease(release.id);
	expect(closed.permissions.edit).toBe(false);
	expect(member(closed).versionId).toBe(member(release).versionId);
	const reopenRes = await reopen(context, { id: release.id, user: creator });
	assert(!reopenRes.error, JSON.stringify(reopenRes.error));
	const reopened = await readRelease(release.id);
	expect(reopened.permissions.edit).toBe(true);
	expect(reopened.events.map((event) => event.type)).toEqual([
		"comment",
		"closed",
		"reopened",
	]);
});

test("new releases have timestamps and sort by their latest update", async () => {
	const documentId = await createDocument();
	const first = await createRelease(documentId);
	const second = await createRelease(documentId);
	expect(first.updatedAt).toBe(first.createdAt);
	expect(second.updatedAt).toBe(second.createdAt);
	const Releases = new ReleasesRepository(context.db);
	const firstTimestamp = await Releases.updateSingle({
		where: [{ key: "id", operator: "=", value: first.id }],
		data: { updated_at: "2026-01-01T00:00:00.000Z" },
	});
	expect(firstTimestamp.error).toBeUndefined();
	const secondTimestamp = await Releases.updateSingle({
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
	expect((await list()).data?.data.map((release) => release.id)).toEqual([
		second.id,
		first.id,
	]);
	const updated = await updateSingle(context, {
		id: first.id,
		title: "Updated release",
		user: creator,
	});
	expect(updated.error).toBeUndefined();
	expect((await list()).data?.data.map((release) => release.id)).toEqual([
		first.id,
		second.id,
	]);
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
	const first = await createRelease(id, ["staging"], "latest", key);
	const second = await createRelease(id, ["staging"], "latest", key);
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
	await approveRelease(first.id);
	await approveRelease(second.id);
	await move(versionOf(first), undefined, [reviewer.id]);
	expect((await readRelease(first.id)).approved).toBe(true);
	await move(versionOf(first), "draft");
	expect((await readRelease(first.id)).approved).toBe(false);
	expect(member(await readRelease(first.id)).workflowStage).toBe("draft");
	expect((await readRelease(second.id)).approved).toBe(true);
	await move(latest.data.id, "draft");
	expect((await readRelease(second.id)).approved).toBe(true);
	await publishRelease(second.id);
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
	const promotion = await createRelease(id, ["production"], "staging", key);
	expect(member(promotion).workflowStage).toBeNull();
	expect(promotion.blockers).toEqual([]);
	await approveRelease(promotion.id);
	await publishRelease(promotion.id);
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
	const first = await createRelease(id, ["staging"], "latest", key);
	const sibling = await createRelease(id, ["staging"], "latest", key);
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
	const approved = await approveRelease(first.id);
	const proposal = await readVersionContent(context, {
		collectionKey: key,
		documentId: id,
		versionId: member(approved).versionId ?? undefined,
	});
	assert(proposal.data);
	expect((await alignContent(approved, "latest")).error).toBeUndefined();
	const aligned = await readRelease(first.id);
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
	const release = await createRelease(id, ["staging"], "latest", key);
	expect(
		(
			await updateWorkflow(context, {
				collectionKey: key,
				documentId: id,
				versionId: versionOf(release),
				stage: "ready",
				user: creator,
			})
		).error,
	).toBeUndefined();
	await editProposal(release, "Staging content");
	await releaseNow(release);
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

test("cross-collection releases publish every document and target without changing latest", async () => {
	const pageId = await createDocument("release_pages", "Page", "Page original");
	const articleId = await createDocument(
		"release_articles",
		"Article",
		"Article original",
	);
	const created = await createSingle(context, {
		title: "Grouped launch",
		user: creator,
		documents: [
			{
				collectionKey: "release_pages",
				documentId: pageId,
				source: "latest",
				targets: ["staging", "production"],
			},
			{
				collectionKey: "release_articles",
				documentId: articleId,
				source: "latest",
				targets: ["staging"],
			},
		],
	});
	assert(created.data, JSON.stringify(created.error));
	const grouped = await readRelease(created.data.id);
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
	const approved = await approveRelease(created.data.id);
	expect(
		approved.documents.every(
			(document) => document.approvedVersionId !== document.versionId,
		),
	).toBe(true);
	const published = await publishRelease(approved.id);
	expect(published.status).toBe("released");
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
			"release_articles",
		),
	).toBe("Article original");
	const listed = await getMultiple(context, {
		user: creator,
		query: {
			filter: {
				collectionKey: { value: "release_articles", operator: "=" },
				documentId: { value: articleId, operator: "=" },
			},
			page: 1,
			perPage: 10,
		},
	});
	assert(listed.data, JSON.stringify(listed.error));
	expect(
		listed.data.data.find((release) => release.id === approved.id)?.documents,
	).toHaveLength(2);
});

test("membership changes dismiss group approval, clean up private versions and reject duplicates", async () => {
	const pageId = await createDocument();
	const articleId = await createDocument("release_articles");
	const release = await createRelease(pageId);
	const oldReview = reviewInput(await approveRelease(release.id));
	const added = await addDocuments(context, {
		id: release.id,
		documents: [
			{
				collectionKey: "release_articles",
				documentId: articleId,
				source: "latest",
				targets: ["staging"],
			},
		],
		user: creator,
	});
	assert(!added.error, JSON.stringify(added.error));
	const withArticle = await readRelease(release.id);
	expect(withArticle.approved).toBe(false);
	expect(withArticle.documents).toHaveLength(2);
	expect(
		(await approve(context, { ...oldReview, user: reviewer })).error?.status,
	).toBe(409);
	expect(
		(
			await addDocuments(context, {
				id: release.id,
				documents: [
					{
						collectionKey: "release_articles",
						documentId: articleId,
						source: "latest",
						targets: ["staging"],
					},
				],
				user: creator,
			})
		).error?.status,
	).toBe(409);
	const approved = await approveRelease(release.id);
	const article = approved.documents.find(
		(document) => document.collectionKey === "release_articles",
	);
	assert(article?.versionId);
	const removed = await removeDocument(context, {
		id: release.id,
		releaseDocumentId: article.id,
		user: creator,
	});
	assert(!removed.error, JSON.stringify(removed.error));
	const withoutArticle = await readRelease(release.id);
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
				id: release.id,
				releaseDocumentId: member(withoutArticle).id,
				user: creator,
			})
		).error?.status,
	).toBe(400);
	const readded = await addDocuments(context, {
		id: release.id,
		documents: [
			{
				collectionKey: "release_articles",
				documentId: articleId,
				source: "latest",
				targets: ["staging"],
			},
		],
		user: creator,
	});
	assert(!readded.error, JSON.stringify(readded.error));
	expect(
		(await readRelease(release.id)).documents.find(
			(document) => document.collectionKey === "release_articles",
		)?.versionId,
	).not.toBe(article.versionId);
});

test.each([
	"response",
	"throw",
] as const)("a %s failure on a later document rolls back the group and can be retried", async (failureMode) => {
	const pageId = await createDocument();
	const articleId = await createDocument("release_articles");
	const created = await createSingle(context, {
		title: "Atomic launch",
		user: creator,
		documents: [
			{
				collectionKey: "release_pages",
				documentId: pageId,
				source: "latest",
				targets: ["staging"],
			},
			{
				collectionKey: "release_articles",
				documentId: articleId,
				source: "latest",
				targets: ["staging"],
			},
		],
	});
	assert(created.data, JSON.stringify(created.error));
	const approved = await approveRelease(created.data.id);
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
	const queued = await publish(context, { id: approved.id, user: creator });
	assert(queued.data, JSON.stringify(queued.error));
	expect(await consumeJob(failingContext, queued.data)).toEqual({
		type: "failed",
	});
	const detail = await readRelease(approved.id);
	expect(detail).toMatchObject({
		status: "open",
		approved: true,
		failure: failureMode === "throw" ? expect.any(String) : "Target is frozen",
		failureReleaseDocumentId: failedDocument.id,
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
	const retried = await publishRelease(approved.id);
	expect(retried).toMatchObject({
		status: "released",
		failure: null,
		failureReleaseDocumentId: null,
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
			collectionKey: "release_pages",
			documentId,
			source: "latest",
			targets: ["staging"],
		})),
	});
	assert(grouped.data, JSON.stringify(grouped.error));
	const independent = await createRelease(firstId);
	await releaseNow(independent);
	const changed = await readRelease(grouped.data.id);
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
		{ code: "review_required", target: "staging", releaseDocumentId: first.id },
	]);
	const reviewed = await reviewTarget(context, {
		id: changed.id,
		releaseDocumentId: first.id,
		target: "staging",
		revision: changed.revision,
		targetVersionId: first.targets[0]?.versionId ?? null,
		reviewed: true,
		user: reviewer,
	});
	assert(!reviewed.error, JSON.stringify(reviewed.error));
	await approveRelease(changed.id);
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
	expect((await readRelease(changed.id)).approved).toBe(false);
});

test("mixed-collection access and publishing permissions cover every member", async () => {
	const pageId = await createDocument();
	const articleId = await createDocument("release_articles");
	const created = await createSingle(context, {
		title: "Restricted launch",
		user: creator,
		documents: [
			{
				collectionKey: "release_pages",
				documentId: pageId,
				source: "latest",
				targets: ["staging"],
			},
			{
				collectionKey: "release_articles",
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
			Permissions.ReleasesRead,
			getCollectionPermission("release_pages", "read"),
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
		listed.data.data.some((release) => release.id === created.data.id),
	).toBe(false);
	const publisher: LucidUser = {
		...reviewer,
		superAdmin: false,
		permissions: [
			Permissions.ReleasesRead,
			getCollectionPermission("release_pages", "read"),
			getCollectionPermission("release_articles", "read"),
			getCollectionPermission("release_pages", "publish"),
		],
	};
	await approveRelease(created.data.id);
	expect(
		(await publish(context, { id: created.data.id, user: publisher })).error
			?.status,
	).toBe(403);
});

test("one scheduled job publishes mixed proposals and snapshots for the group", async () => {
	const pageId = await createDocument();
	const articleId = await createDocument("release_articles");
	await releaseNow(
		await createRelease(articleId, ["staging"], "latest", "release_articles"),
	);
	const created = await createSingle(context, {
		title: "Scheduled group",
		user: creator,
		documents: [
			{
				collectionKey: "release_pages",
				documentId: pageId,
				source: "latest",
				targets: ["staging"],
			},
			{
				collectionKey: "release_articles",
				documentId: articleId,
				source: "staging",
				targets: ["production"],
			},
		],
	});
	assert(created.data, JSON.stringify(created.error));
	expect(
		(await readRelease(created.data.id)).documents
			.map((document) => document.source)
			.sort(),
	).toEqual(["latest", "staging"]);
	const { revision } = await approveRelease(created.data.id);
	const Releases = new ReleasesRepository(context.db);
	expect(
		(
			await Releases.updateSingle({
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
	expect((await readRelease(created.data.id)).status).toBe("open");
	expect(
		(await execute(context, { ...job, jobId: "group-job" })).error,
	).toBeUndefined();
	expect((await readRelease(created.data.id)).status).toBe("released");
	expect(await fieldOf(pageId, "summary", "staging")).toBe("Original");
	expect(
		await fieldOf(
			articleId,
			"summary",
			"production",
			undefined,
			"release_articles",
		),
	).toBe("Original");
});
