import type { CollectionDocumentKey } from "../../../exports/types.js";
import type {
	RequestDetail,
	RequestExecutionReceipt,
} from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import acknowledge, {
	type ToolkitRequestsAcknowledgeInput,
} from "./acknowledge/index.js";
import approve, { type ToolkitRequestsApproveInput } from "./approve/index.js";
import close, { type ToolkitRequestsCloseInput } from "./close/index.js";
import create, {
	type ToolkitRequestsCommentsCreateInput,
} from "./comments/create/index.js";
import deleteComment, {
	type ToolkitRequestsCommentsDeleteInput,
} from "./comments/delete/index.js";
import resolve, {
	type ToolkitRequestsCommentsResolveInput,
} from "./comments/resolve/index.js";
import update, {
	type ToolkitRequestsCommentsUpdateInput,
} from "./comments/update/index.js";
import complete, {
	type ToolkitRequestsCompleteInput,
} from "./complete/index.js";
import createSingle, {
	type ToolkitRequestsCreateSingleInput,
} from "./create-single/index.js";
import add, {
	type ToolkitRequestsDocumentsAddInput,
} from "./documents/add/index.js";
import remove, {
	type ToolkitRequestsDocumentsRemoveInput,
} from "./documents/remove/index.js";
import setTargets, {
	type ToolkitRequestsDocumentsSetTargetsInput,
} from "./documents/set-targets/index.js";
import getMultiple, {
	type ToolkitRequestsGetMultipleInput,
	type ToolkitRequestsGetMultipleResult,
} from "./get-multiple/index.js";
import getSingle, {
	type ToolkitRequestsGetSingleInput,
} from "./get-single/index.js";
import reopen, { type ToolkitRequestsReopenInput } from "./reopen/index.js";
import schedule, {
	type ToolkitRequestsScheduleInput,
} from "./schedule/index.js";
import type { ToolkitRequestTarget } from "./types.js";
import unapprove, {
	type ToolkitRequestsUnapproveInput,
} from "./unapprove/index.js";
import updateSingle, {
	type ToolkitRequestsUpdateSingleInput,
} from "./update-single/index.js";

export type * from "./types.js";

/** Provides request operations as a user with current permissions or as the system, using `execution.actor` to retain agent attribution. */
export type ToolkitRequests = {
	/**
	 * Lists requests the actor can read.
	 *
	 * @example
	 * ```ts
	 * await toolkit.requests.getMultiple({
	 *   query: {
	 *     filter: {
	 *       status: { value: "open" },
	 *       approval: { value: "pending" },
	 *     },
	 *   },
	 * });
	 * ```
	 */
	getMultiple: (
		input?: ToolkitRequestsGetMultipleInput,
	) => ServiceResponse<ToolkitRequestsGetMultipleResult>;
	/** Returns a request with its documents, activity, blockers, the actor's permissions and a `reviewToken` for acknowledging or approving. */
	getSingle: (
		input: ToolkitRequestsGetSingleInput,
	) => ServiceResponse<RequestDetail>;
	/**
	 * Opens a publish, unpublish or delete request for people to review.
	 *
	 * @example
	 * ```ts
	 * await toolkit.requests.createSingle({
	 *   actor: { kind: "system" },
	 *   type: "publish",
	 *   title: "Spring launch",
	 *   description: "<p>Ready for review.</p>",
	 *   documents: [
	 *     { collectionKey: "page", documentId: 1, source: "latest", targets: ["production"] },
	 *   ],
	 * });
	 * ```
	 */
	createSingle: <K extends CollectionDocumentKey>(
		input: ToolkitRequestsCreateSingleInput<K>,
	) => ServiceResponse<{ id: number }>;
	/** Updates the title, description or reviewers, keeping approvals. */
	updateSingle: (
		input: ToolkitRequestsUpdateSingleInput,
	) => ServiceResponse<undefined>;
	/** Closes a request without completing it. */
	close: (input: ToolkitRequestsCloseInput) => ServiceResponse<undefined>;
	/** Reopens a closed request, withdrawing earlier approvals. */
	reopen: (input: ToolkitRequestsReopenInput) => ServiceResponse<undefined>;
	/**
	 * Acknowledges selected changed targets, defaulting to all waiting targets, only while the review token still matches.
	 *
	 * @example
	 * ```ts
	 * const request = await toolkit.requests.getSingle({ id: 1 });
	 * if (request.error) return request;
	 *
	 * await toolkit.requests.acknowledge({
	 *   id: 1,
	 *   actor: { kind: "system" },
	 *   ifUnchanged: request.data.reviewToken,
	 * });
	 * ```
	 */
	acknowledge: (
		input: ToolkitRequestsAcknowledgeInput,
	) => ServiceResponse<{ targets: ToolkitRequestTarget[] }>;
	/**
	 * Approves the request as a person, only while the review token still matches. Approvals need a user actor.
	 *
	 * @example
	 * ```ts
	 * const request = await toolkit.requests.getSingle({ id: 1 });
	 * if (request.error) return request;
	 *
	 * await toolkit.requests.approve({
	 *   id: 1,
	 *   actor: { kind: "user", userId: 1 },
	 *   ifUnchanged: request.data.reviewToken,
	 *   body: "<p>Checked the links.</p>",
	 * });
	 * ```
	 */
	approve: (input: ToolkitRequestsApproveInput) => ServiceResponse<undefined>;
	/** Withdraws the person's approval. An approved request goes back to waiting for approval. */
	unapprove: (
		input: ToolkitRequestsUnapproveInput,
	) => ServiceResponse<undefined>;
	/** Schedules completion after approval, or removes the schedule when given null. */
	schedule: (input: ToolkitRequestsScheduleInput) => ServiceResponse<undefined>;
	/** Queues completion of an approved request, returning the job to follow. */
	complete: (
		input: ToolkitRequestsCompleteInput,
	) => ServiceResponse<RequestExecutionReceipt>;
	documents: {
		/** Adds documents to a request, capturing publish content and withdrawing approvals. */
		add: <K extends CollectionDocumentKey>(
			input: ToolkitRequestsDocumentsAddInput<K>,
		) => ServiceResponse<undefined>;
		/** Removes a document and its captured content while keeping at least one document in the request. */
		remove: (
			input: ToolkitRequestsDocumentsRemoveInput,
		) => ServiceResponse<undefined>;
		/** Replaces a request document's targets and withdraws approvals. */
		setTargets: <K extends CollectionDocumentKey>(
			input: ToolkitRequestsDocumentsSetTargetsInput<K>,
		) => ServiceResponse<undefined>;
	};
	comments: {
		/**
		 * Adds a comment or a reply with `replyTo`, withdrawing approvals only for top-level comments.
		 *
		 * @example
		 * ```ts
		 * await toolkit.requests.comments.create({
		 *   id: 1,
		 *   actor: execution.actor,
		 *   body: "<p>The hero image is missing alt text.</p>",
		 * });
		 * ```
		 */
		create: (
			input: ToolkitRequestsCommentsCreateInput,
		) => ServiceResponse<{ id: number }>;
		/** Rewrites the actor's own comment or reply. */
		update: (
			input: ToolkitRequestsCommentsUpdateInput,
		) => ServiceResponse<undefined>;
		/** Resolves, closes or, with null, reopens a comment's thread. */
		resolve: (
			input: ToolkitRequestsCommentsResolveInput,
		) => ServiceResponse<undefined>;
		/** Deletes a comment and its replies. */
		delete: (
			input: ToolkitRequestsCommentsDeleteInput,
		) => ServiceResponse<undefined>;
	};
};

export const createRequestsToolkit = (
	context: ServiceContext,
): ToolkitRequests => ({
	getMultiple: (input) => getMultiple(context, input),
	getSingle: (input) => getSingle(context, input),
	createSingle: (input) => createSingle(context, input),
	updateSingle: (input) => updateSingle(context, input),
	close: (input) => close(context, input),
	reopen: (input) => reopen(context, input),
	acknowledge: (input) => acknowledge(context, input),
	approve: (input) => approve(context, input),
	unapprove: (input) => unapprove(context, input),
	schedule: (input) => schedule(context, input),
	complete: (input) => complete(context, input),
	documents: {
		add: (input) => add(context, input),
		remove: (input) => remove(context, input),
		setTargets: (input) => setTargets(context, input),
	},
	comments: {
		create: (input) => create(context, input),
		update: (input) => update(context, input),
		resolve: (input) => resolve(context, input),
		delete: (input) => deleteComment(context, input),
	},
});

export default createRequestsToolkit;
