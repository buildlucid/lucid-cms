import type { RichTextJSON } from "@lucidcms/rich-text";
import type { RequestType } from "../../libs/db/tables/requests.js";
import type { DocumentBeforeUpsertHookOrigin } from "../../libs/hooks/types.js";
import { copy } from "../../libs/i18n/index.js";
import { RequestsRepository } from "../../libs/repositories/index.js";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type { RequestDocumentInput } from "../../schemas/requests.js";
import type { LucidActor } from "../../types/hono.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import recordRoutineEvent from "../agent/helpers/record-routine-event.js";
import captureDocument from "./helpers/capture-document.js";
import captureNewDocument from "./helpers/capture-new-document.js";
import checkRequestSize from "./helpers/check-request-size.js";
import notifyMentions from "./helpers/notify-mentions.js";
import resolveMentions from "./helpers/resolve-mentions.js";
import setReviewers from "./helpers/set-reviewers.js";

type CreateRequestInput = {
	title: string;
	description?: RichTextJSON | null;
	reviewerIds?: number[];
	user: LucidActor;
	agentRunId?: string;
};
type CreateDocumentRequestInput = CreateRequestInput & {
	type: "create";
	/** The new document, saved as the request's proposal. */
	document: {
		collectionKey: string;
		/** Portable identity for the new document, eg. from an import. */
		uid?: string;
		/** Why the document is saved, passed to `beforeUpsert` hooks. */
		origin?: DocumentBeforeUpsertHookOrigin;
		bricks?: Array<BrickInputSchema>;
		fields?: Array<FieldInputSchema>;
	};
};
type ChangeDocumentsRequestInput = CreateRequestInput & {
	type: Exclude<RequestType, "create">;
	documents: RequestDocumentInput[];
	/** Limits a publish request from latest to these content locales, so completing it keeps other locales' edits made meanwhile. */
	locales?: string[];
};

/**
 * Opens a request by capturing existing documents or saving a new document as a create-request proposal.
 * @returns Create requests include the new document and proposal version IDs.
 */
function createSingle(
	context: ServiceContext,
	data: CreateDocumentRequestInput,
): ServiceResponse<{ id: number; document: { id: number; versionId: number } }>;
function createSingle(
	context: ServiceContext,
	data: ChangeDocumentsRequestInput,
): ServiceResponse<{ id: number }>;
async function createSingle(
	context: ServiceContext,
	data: CreateDocumentRequestInput | ChangeDocumentsRequestInput,
): ServiceResponse<{
	id: number;
	document?: { id: number; versionId: number };
}> {
	const Requests = new RequestsRepository(context.db);

	if (data.type !== "create") {
		const keys = data.documents.map(
			(document) => `${document.collectionKey}:${document.documentId}`,
		);
		if (new Set(keys).size !== keys.length) {
			return {
				error: {
					type: "basic",
					message: copy("server:core.requests.documents.invalid"),
					status: 400,
				},
				data: undefined,
			};
		}

		const sizeRes = checkRequestSize(data.documents.length);
		if (sizeRes.error) return sizeRes;

		if (
			data.locales !== undefined &&
			(data.type !== "publish" ||
				data.locales.length === 0 ||
				new Set(data.locales).size !== data.locales.length)
		) {
			return {
				error: {
					type: "basic",
					message: copy("server:core.requests.locales.invalid"),
					status: 400,
				},
				data: undefined,
			};
		}
	}

	const locales =
		data.type === "create" ? null : (data.locales?.toSorted() ?? null);

	const documents =
		data.type === "create"
			? [{ collection_key: data.document.collectionKey }]
			: data.documents.map((document) => ({
					collection_key: document.collectionKey,
				}));

	const descriptionRes = data.description
		? await resolveMentions(context, {
				request: { documents },
				body: data.description,
			})
		: undefined;
	if (descriptionRes?.error) return descriptionRes;

	const now = new Date().toISOString();
	const requestRes = await Requests.createSingle({
		data: {
			type: data.type,
			title: data.title,
			description: descriptionRes?.data ?? null,
			status: "open",
			locales,
			revision: 1,
			created_by: data.user.id,
			created_by_run_id: data.agentRunId ?? null,
			created_at: now,
			updated_at: now,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	if (requestRes.error) return requestRes;

	let created: { id: number; versionId: number } | undefined;
	if (data.type === "create") {
		const createdRes = await captureNewDocument(context, {
			...data.document,
			requestId: requestRes.data.id,
			user: data.user,
			agentRunId: data.agentRunId,
		});
		if (createdRes.error) return createdRes;

		created = createdRes.data;
	} else {
		//* Match acquireRequestWrites claim order to avoid deadlocks between these writers.
		for (const document of data.documents.toSorted((a, b) =>
			a.collectionKey === b.collectionKey
				? a.documentId - b.documentId
				: a.collectionKey < b.collectionKey
					? -1
					: 1,
		)) {
			const captureRes = await captureDocument(context, {
				...document,
				request: {
					id: requestRes.data.id,
					type: data.type,
					created_by: data.user.id,
					locales,
				},
				user: data.user,
				agentRunId: data.agentRunId,
			});
			if (captureRes.error) return captureRes;
		}
	}

	if (data.reviewerIds?.length) {
		const reviewersRes = await setReviewers(context, {
			request: {
				id: requestRes.data.id,
				type: data.type,
				title: data.title,
				created_by: data.user.id,
				documents,
				reviewers: [],
			},
			reviewerIds: data.reviewerIds,
			userId: data.user.id,
			agentRunId: data.agentRunId,
		});
		if (reviewersRes.error) return reviewersRes;
	}

	if (descriptionRes?.data) {
		const mentionsRes = await notifyMentions(context, {
			request: { id: requestRes.data.id, title: data.title },
			body: descriptionRes.data,
			actorUserId: data.user.id,
			actorRunId: data.agentRunId,
		});
		if (mentionsRes.error) return mentionsRes;
	}

	const recordedRes = await recordRoutineEvent(context, {
		event: "requests:created",
		subjects: [{ type: "request", requestId: requestRes.data.id }],
		facts: {
			requestType: data.type,
			collections: documents.map((document) => document.collection_key),
		},
		agentRunId: data.agentRunId,
	});
	if (recordedRes.error) return recordedRes;

	return {
		error: undefined,
		data: { id: requestRes.data.id, document: created },
	};
}

export default createSingle;
