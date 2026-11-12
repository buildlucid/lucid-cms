import type { InvitedUser } from "../harness/src/client/invite-user.ts";
import type { Lucid } from "../harness/src/client/open-lucid.ts";
import type { ApiResponse, Session } from "../harness/src/client/types.ts";
import { type DocumentInput, expectStatus } from "./documents.ts";

export type RequestType = "create" | "publish" | "unpublish" | "delete";

/** Why a request can't be approved or completed yet. */
export type Blocker = {
	code:
		| "collection_unavailable"
		| "migration_required"
		| "collection_locked"
		| "document_deleted"
		| "document_permanently_deleted"
		| "source_missing"
		| "no_targets"
		| "target_unavailable"
		| "workflow"
		| "prerequisite"
		| "acknowledge_required"
		| "target_changed"
		| "scheduling_unavailable"
		| "comments_open"
		| "check";
	requestDocumentId?: number;
	target?: string;
	required?: string;
};

/** One document in a request, as `GET /api/v1/requests/{id}` gives it. */
export type RequestDocument = {
	/** The request document's own ID, which the routes for its targets take. */
	id: number;
	collectionKey: string;
	documentId: number;
	deleted: "bin" | "permanent" | null;
	source: string | null;
	/** The request's proposal or snapshot. */
	versionId: number | null;
	contentId: string | null;
	approvedVersionId: number | null;
	workflowStage: string | null;
	targets: Array<{
		target: string;
		versionId: number | null;
		changed: boolean;
		changedSinceCreation: boolean;
		acknowledged: boolean;
	}>;
	blockers: Blocker[];
};

/** The parts of `GET /api/v1/requests/{id}` tests read. */
export type RequestDetail = {
	id: number;
	type: RequestType;
	title: string;
	status: "open" | "completed" | "closed";
	locales: string[] | null;
	approved: boolean;
	revision: number;
	executionJobId: string | null;
	approvals: Array<{ user: { id: number } | null }>;
	requiredApprovals: number;
	scheduledAt: string | null;
	failure: { message: string } | null;
	completedAt: string | null;
	reviewers: Array<{ id: number }>;
	documents: RequestDocument[];
	events: Array<{
		id: number;
		type: string;
		actor: { id: number } | null;
		resolution?: "resolved" | "closed" | null;
		replies?: Array<{ id: number }>;
	}>;
	blockers: Blocker[];
	openComments: number;
	reviewToken: string;
	permissions: {
		edit: boolean;
		approve: boolean;
		complete: boolean;
		reopen: boolean;
	};
};

/** A request's job, from `GET /api/v1/requests/{id}/execution`. Null until it is completed or scheduled. */
export type RequestExecution = {
	jobId: string;
	status: "queued" | "running" | "completed" | "failed" | "cancelled";
	runAt: string | null;
	error: string | null;
} | null;

/** A document for a publish, unpublish or delete request. Publish requests take latest unless given a `source`. */
export type RequestedDocument = {
	collectionKey: string;
	documentId: number;
	targets?: string[];
	source?: string;
};

const REQUESTS = "/api/v1/requests";

/** A rich text value of one paragraph, for comments and descriptions. */
export const richText = (text: string) => ({
	type: "doc",
	content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

/** Asks for a new document through a create request, returning the response so a test can check a refusal. */
export const requestCreation = (
	session: Session,
	collectionKey: string,
	input: DocumentInput & { title?: string; reviewerIds?: number[] },
) =>
	session.request<{ data: { id: number; requestId: number } }>({
		method: "POST",
		path: `/api/v1/documents/${collectionKey}/request`,
		body: { title: "New document", ...input },
	});

/** Opens a create request, which must be accepted, and returns the new document's ID and the request's. */
export const openCreateRequest = async (
	session: Session,
	collectionKey: string,
	input: DocumentInput & { title?: string; reviewerIds?: number[] },
): Promise<{ id: number; requestId: number }> => {
	const requested = await requestCreation(session, collectionKey, input);
	expectStatus(`Requesting a ${collectionKey} document`, requested, 201);
	return requested.body.data;
};

/** Asks for a publish, unpublish or delete request, returning the response so a test can check a refusal. */
export const requestChange = (
	session: Session,
	type: Exclude<RequestType, "create">,
	documents: RequestedDocument[],
	options: { title?: string; reviewerIds?: number[]; locales?: string[] } = {},
) =>
	session.request<{ data: { id: number } }>({
		method: "POST",
		path: REQUESTS,
		body: {
			title: `${type} ${documents.map((document) => document.documentId).join(", ")}`,
			...options,
			type,
			documents: documents.map((document) => ({
				...document,
				//* only a publish request has content to take from somewhere
				source: type === "publish" ? (document.source ?? "latest") : undefined,
			})),
		},
	});

/** Opens a publish, unpublish or delete request, which must be accepted, and returns its ID. */
export const openRequest = async (
	...args: Parameters<typeof requestChange>
): Promise<number> => {
	const opened = await requestChange(...args);
	expectStatus(`Opening a ${args[1]} request`, opened, 201);
	return opened.body.data.id;
};

/** Reads a request, which the session must be able to read. */
export const readRequest = async (
	session: Session,
	id: number,
): Promise<RequestDetail> => {
	const read = await session.request<{ data: RequestDetail }>({
		path: `${REQUESTS}/${id}`,
	});
	expectStatus(`Reading request ${id}`, read, 200);
	return read.body.data;
};

/**
 * Approves the current request, or the version identified by `ifUnchanged`. Returns the response
 * for assertions.
 */
export const approve = async (
	session: Session,
	id: number,
	ifUnchanged?: string,
): Promise<ApiResponse<unknown>> =>
	session.request({
		method: "POST",
		path: `${REQUESTS}/${id}/approve`,
		body: {
			ifUnchanged: ifUnchanged ?? (await readRequest(session, id)).reviewToken,
		},
	});

/** Sends a request action that takes no body, such as `complete`, `close`, `reopen` or `unapprove`. */
export const requestAction = (
	session: Session,
	id: number,
	action: "complete" | "close" | "reopen" | "unapprove",
) =>
	session.request<{ data: { jobId: string } | null }>({
		method: "POST",
		path: `${REQUESTS}/${id}/${action}`,
	});

const RUN_TIMEOUT_MS = 30_000;

/**
 * Waits for request execution and returns its outcome. Background queues may finish after
 * `complete` responds.
 */
export const waitForRequestRun = async (
	session: Session,
	id: number,
	options: { timeout?: number } = {},
): Promise<NonNullable<RequestExecution>> => {
	const deadline = performance.now() + (options.timeout ?? RUN_TIMEOUT_MS);
	while (performance.now() < deadline) {
		const execution = await session.request<{ data: RequestExecution }>({
			path: `${REQUESTS}/${id}/execution`,
		});
		expectStatus(`Reading request ${id}'s execution`, execution, 200);

		const { data } = execution.body;
		if (
			data &&
			(data.status === "completed" ||
				data.status === "failed" ||
				data.status === "cancelled")
		) {
			return data;
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error(`Request ${id} was not applied in time.`);
};

/** Completes an approved request and waits for its changes, which must be applied. */
export const completeRequest = async (
	session: Session,
	id: number,
): Promise<void> => {
	expectStatus(
		`Completing request ${id}`,
		await requestAction(session, id, "complete"),
		202,
	);
	const run = await waitForRequestRun(session, id);
	if (run.status !== "completed") {
		throw new Error(`Request ${id} ended ${run.status}: ${run.error}`);
	}
};

/**
 * Approves a request and completes it, then waits for its changes to be applied. The collection
 * must allow whoever `session` is to approve it alone.
 */
export const approveAndCompleteRequest = async (
	session: Session,
	id: number,
): Promise<void> => {
	expectStatus(`Approving request ${id}`, await approve(session, id), 204);
	await completeRequest(session, id);
};

/** The document of a request that holds exactly one, such as every create request. */
export const onlyDocument = (request: RequestDetail): RequestDocument => {
	const [document, ...others] = request.documents;
	if (!document || others.length > 0) {
		throw new Error(
			`Request ${request.id} holds ${request.documents.length} documents, not one.`,
		);
	}
	return document;
};

/** Edits a request's own proposal, returning the response. */
export const editProposal = (
	session: Session,
	document: Pick<RequestDocument, "collectionKey" | "documentId" | "versionId">,
	input: DocumentInput,
) =>
	session.request({
		method: "PATCH",
		path: `/api/v1/documents/${document.collectionKey}/${document.documentId}/${document.versionId}`,
		body: input,
	});

/** Replaces a request document's targets, returning the response. */
export const setTargets = (
	session: Session,
	id: number,
	requestDocumentId: number,
	targets: string[],
) =>
	session.request({
		method: "PATCH",
		path: `${REQUESTS}/${id}/documents/${requestDocumentId}/targets`,
		body: { targets },
	});

/** Acknowledges a changed target as the request is now, returning the response. */
export const acknowledgeTarget = async (
	session: Session,
	id: number,
	requestDocumentId: number,
	target: string,
) =>
	session.request({
		method: "PATCH",
		path: `${REQUESTS}/${id}/documents/${requestDocumentId}/targets/acknowledgement`,
		body: {
			target,
			acknowledged: true,
			ifUnchanged: (await readRequest(session, id)).reviewToken,
		},
	});

/** Posts a comment, or a reply when given `parentId`, and returns the response. */
export const postComment = (
	session: Session,
	id: number,
	text: string,
	parentId?: number,
) =>
	session.request({
		method: "POST",
		path: `${REQUESTS}/${id}/comments`,
		body: { body: richText(text), parentId },
	});

/** The comments on a request, oldest first. */
export const commentsOf = (request: RequestDetail) =>
	request.events.filter((event) => event.type === "comment");

/** Who a request's approvals are from. */
export const approverIds = (request: RequestDetail) =>
	request.approvals.flatMap((approval) =>
		approval.user ? [approval.user.id] : [],
	);

/** The blocker codes a request has, for comparing. */
export const blockerCodes = (request: RequestDetail) =>
	request.blockers.map((blocker) => blocker.code).toSorted();

/**
 * Creates an author and two reviewers without super-admin access, so collection approval rules
 * apply.
 */
export type RequestTeam = {
	author: InvitedUser;
	reviewer: InvitedUser;
	secondReviewer: InvitedUser;
};

/** The permissions an author has on a collection: reading, editing and asking for everything else. */
export const authorPermissions = (collectionKey: string) => [
	"requests:read",
	...[
		"read",
		"update",
		"create-request",
		"delete-request",
		"unpublish-request",
	].map((action) => `documents:${collectionKey}:${action}`),
];

/** The permissions a reviewer has on a collection: everything an author does, and approving and completing it. */
export const reviewerPermissions = (collectionKey: string) => [
	"requests:read",
	...["read", "update", "create", "delete", "publish", "review"].map(
		(action) => `documents:${collectionKey}:${action}`,
	),
];

const teams = new WeakMap<Lucid, Map<string, Promise<RequestTeam>>>();

/**
 * The request team for a collection. A file's tests share it, as inviting people takes a while,
 * so give each test its own documents and requests.
 */
export const requestTeam = (
	lucid: Lucid,
	collectionKey: string,
): Promise<RequestTeam> => {
	const byCollection = teams.get(lucid) ?? new Map();
	teams.set(lucid, byCollection);

	const existing = byCollection.get(collectionKey);
	if (existing) {
		return existing;
	}
	const team = (async () => ({
		author: await lucid.user({ permissions: authorPermissions(collectionKey) }),
		reviewer: await lucid.user({
			permissions: reviewerPermissions(collectionKey),
		}),
		secondReviewer: await lucid.user({
			permissions: reviewerPermissions(collectionKey),
		}),
	}))();
	byCollection.set(collectionKey, team);
	return team;
};

/**
 * Creates a document through a request approved and completed by `session`, returning its ID.
 * Requires super-admin access to approve alone.
 */
export const createThroughRequest = async (
	session: Session,
	collectionKey: string,
	input: DocumentInput & { title?: string },
): Promise<number> => {
	const { id, requestId } = await openCreateRequest(
		session,
		collectionKey,
		input,
	);
	await approveAndCompleteRequest(session, requestId);
	return id;
};

/**
 * Has the team create a document: the author asks for it, both reviewers approve and the first
 * completes it. Returns the new document's ID.
 */
export const createWithTeam = async (
	team: RequestTeam,
	collectionKey: string,
	input: DocumentInput & { title?: string },
): Promise<number> => {
	const { id, requestId } = await openCreateRequest(
		team.author.session,
		collectionKey,
		input,
	);
	for (const reviewer of [team.reviewer, team.secondReviewer]) {
		expectStatus(
			`Approving request ${requestId}`,
			await approve(reviewer.session, requestId),
			204,
		);
	}
	await completeRequest(team.reviewer.session, requestId);
	return id;
};

/** A notification, as `GET /api/v1/notifications` lists it. */
export type Notification = {
	type: string;
	actionRequired: boolean;
	data: { requestId?: number };
	resolvedAt: string | null;
};

/** The notifications of a type that a session's user has about one request, newest first. */
export const requestNotifications = async (
	session: Session,
	requestId: number,
	type: string,
): Promise<Notification[]> => {
	const listed = await session.request<{ data: Notification[] }>({
		path: "/api/v1/notifications",
		query: { "filter[type]": type, perPage: 100 },
	});
	expectStatus(`Listing ${type} notifications`, listed, 200);
	return listed.body.data.filter(
		(notification) => notification.data.requestId === requestId,
	);
};
