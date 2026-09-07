import { isDeepStrictEqual } from "node:util";
import collections from "../../libs/collection/collections.js";
import { copy } from "../../libs/i18n/index.js";
import type {
	DocumentData,
	DocumentEditToken,
	DocumentPatch,
} from "../../libs/toolkit/documents/types.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import acquireDocumentWrites from "./helpers/acquire-document-writes.js";
import mergeDocumentData from "./helpers/merge-document-data.js";
import patchDocumentData from "./helpers/patch-document-data.js";
import readDocumentContent from "./helpers/read-document-content.js";
import saveDocument from "./helpers/save-document.js";
import toDocumentInput from "./helpers/to-document-input.js";

/** Resolves authoring values or patches against current content, then uses the shared document save pipeline. */
const writeSingle: ServiceFn<
	[
		{ collectionKey: string; userId: number | null; authUser?: LucidUser } & (
			| { kind: "create"; data: DocumentData }
			| {
					kind: "update";
					id: number;
					ifUnchanged?: DocumentEditToken;
					data: DocumentData;
			  }
			| {
					kind: "patch";
					id: number;
					ifUnchanged?: DocumentEditToken;
					operations: DocumentPatch[];
			  }
		),
	],
	{
		id: number;
		/** Pass this token to a later write to reject changes made since this save. */
		editToken: DocumentEditToken;
		version: { id: number; type: "latest"; contentId: string };
		/** False when the submitted values already match the stored content. */
		changed: boolean;
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

			const saved = await saveDocument(context, {
				collectionKey: input.collectionKey,
				documentId: input.kind === "create" ? undefined : input.id,
				userId: input.userId,
				authUser: input.authUser,
				...payload.data,
			});
			if (saved.error) return saved;

			const content = await readDocumentContent(context, {
				collectionKey: input.collectionKey,
				id: saved.data,
				allowWriteLock: true,
			});
			if (content.error) return content;

			return {
				error: undefined,
				data: {
					id: saved.data,
					editToken: content.data.editToken,
					version: content.data.version,
					changed: true,
				},
			};
		},
		{ isolate: true },
	);

export default writeSingle;
