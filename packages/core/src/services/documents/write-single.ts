import { isDeepStrictEqual } from "node:util";
import type { RichTextJSON } from "@lucidcms/rich-text";
import collections from "../../libs/collection/collections.js";
import { copy } from "../../libs/i18n/index.js";
import systemActor from "../../libs/permission/system-actor.js";
import type {
	DocumentData,
	DocumentEditToken,
	DocumentPatch,
} from "../../libs/toolkit/documents/types.js";
import type { LucidActor } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import updateVersion from "../documents-versions/update-single.js";
import requestCreation from "../requests/request-creation.js";
import acquireDocumentWrites from "./helpers/acquire-document-writes.js";
import mergeDocumentData from "./helpers/merge-document-data.js";
import patchDocumentData from "./helpers/patch-document-data.js";
import readDocumentContent from "./helpers/read-document-content.js";
import saveDocument from "./helpers/save-document.js";
import toDocumentInput from "./helpers/to-document-input.js";

/** Validates and saves authoring values or patches to latest or a new or existing request proposal. */
const writeSingle: ServiceFn<
	[
		{
			collectionKey: string;
			userId: number | null;
			authUser?: LucidActor;
			agentRunId?: string;
		} & (
			| {
					kind: "create";
					data: DocumentData;
					/** Saves the document as the proposal of a new create request instead. */
					request?: { title: string; description?: RichTextJSON | null };
			  }
			| {
					kind: "update";
					id: number;
					/** A request proposal to edit instead of latest. */
					versionId?: number;
					ifUnchanged?: DocumentEditToken;
					data: DocumentData;
			  }
			| {
					kind: "patch";
					id: number;
					/** A request proposal to edit instead of latest. */
					versionId?: number;
					ifUnchanged?: DocumentEditToken;
					operations: DocumentPatch[];
			  }
		),
	],
	{
		id: number;
		/** Pass this token to a later write to reject changes made since this save. */
		editToken: DocumentEditToken;
		version: { id: number; type: string; contentId: string };
		/** False when the submitted values already match the stored content. */
		changed: boolean;
		/** The create request, when the document was requested. */
		requestId?: number;
	}
> = (context, input) =>
	withTransaction(
		context,
		async (context): ReturnType<typeof writeSingle> => {
			const acquired = await acquireDocumentWrites(context, {
				collectionKey: input.collectionKey,
				ids: input.kind === "create" ? [] : [input.id],
			});
			if (acquired.error) return acquired;

			await using _claims = acquired.data;

			const collection = await collections.getSingle(context, {
				key: input.collectionKey,
			});
			if (collection.error) return collection;
			if (collection.data.getData.locked) {
				return {
					error: {
						status: 400,
						message: copy("server:core.error.locked.collection.message"),
					},
					data: undefined,
				};
			}

			const contentContext = {
				collection: collection.data,
				localization: context.config.localization,
			};
			let current:
				| NonNullable<Awaited<ReturnType<typeof readDocumentContent>>["data"]>
				| undefined;
			let merged: ReturnType<typeof mergeDocumentData>;
			if (input.kind === "create") {
				merged = mergeDocumentData(contentContext, input.data);
			} else {
				const content = await readDocumentContent(context, {
					...input,
					allowWriteLock: true,
				});
				if (content.error) return content;

				current = content.data;
				if (
					input.ifUnchanged !== undefined &&
					input.ifUnchanged !== current.editToken
				) {
					return {
						error: {
							status: 409,
							message: copy(
								"server:core.documents.authoring.write.changed.retry",
							),
						},
						data: undefined,
					};
				}

				merged =
					input.kind === "patch"
						? patchDocumentData(contentContext, current.data, input.operations)
						: mergeDocumentData(contentContext, input.data, current.data);
			}

			if (merged.error) return merged;

			if (current && isDeepStrictEqual(merged.data, current.data)) {
				return {
					error: undefined,
					data: {
						id: current.id,
						editToken: current.editToken,
						version: current.version,
						changed: false,
					},
				};
			}

			const payload = toDocumentInput(
				contentContext,
				merged.data,
				current?.stored,
			);
			if (payload.error) return payload;

			let id = input.kind === "create" ? undefined : input.id;
			let versionId = input.kind === "create" ? undefined : input.versionId;
			let requestId: number | undefined;
			if (input.kind === "create" && input.request) {
				const requested = await requestCreation(context, {
					collectionKey: input.collectionKey,
					title: input.request.title,
					description: input.request.description,
					user: input.authUser ?? systemActor,
					agentRunId: input.agentRunId,
					...payload.data,
				});
				if (requested.error) return requested;

				id = requested.data.id;
				versionId = requested.data.versionId;
				requestId = requested.data.requestId;
			} else if (id !== undefined && versionId !== undefined) {
				const updated = await updateVersion(context, {
					collectionKey: input.collectionKey,
					documentId: id,
					versionId,
					userId: input.userId,
					authUser: input.authUser,
					agentRunId: input.agentRunId,
					skipDocumentWriteClaims: true,
					...payload.data,
				});
				if (updated.error) return updated;
			} else {
				const saved = await saveDocument(context, {
					collectionKey: input.collectionKey,
					documentId: id,
					userId: input.userId,
					authUser: input.authUser,
					agentRunId: input.agentRunId,
					...payload.data,
				});
				if (saved.error) return saved;

				id = saved.data;
			}

			const content = await readDocumentContent(context, {
				collectionKey: input.collectionKey,
				id,
				versionId,
				allowWriteLock: true,
			});
			if (content.error) return content;

			return {
				error: undefined,
				data: {
					id,
					editToken: content.data.editToken,
					version: content.data.version,
					changed: true,
					requestId,
				},
			};
		},
		{ isolate: true },
	);

export default writeSingle;
