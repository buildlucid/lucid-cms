import collections from "../../libs/collection/collections.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import executeHooks from "../../libs/hooks/execute-hooks.js";
import { copy } from "../../libs/i18n/index.js";
import { DocumentVersionsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import checkDocumentAccess from "../documents/checks/check-document-access.js";
import acquireDocumentWrites from "../documents/helpers/acquire-document-writes.js";
import invalidateContentDocumentCache from "../documents/helpers/invalidate-content-cache.js";
import notifyChange from "../documents/notify-change.js";
import invalidateRequests from "../requests/helpers/invalidate-requests.js";
import recordTargetChange from "../requests/helpers/record-target-change.js";

/** Removes environment versions in a batch, runs unpublish hooks and invalidates affected request approvals. */
const unpublishVersion: ServiceFn<
	[
		{
			collectionKey: string;
			documentIds: number[];
			target: string;
			userId: number | null;
			/** The request doing the unpublishing, which keeps its approval and is left out of the target activity. */
			requestId?: number;
			/** Leaves cache invalidation and change notifications to the caller, eg. a request that runs them once every document is done. */
			deferEffects?: boolean;
		},
	],
	undefined
> = (context, data) =>
	withTransaction(
		context,
		async (context) => {
			const Versions = new DocumentVersionsRepository(context.db);

			const claimRes = await acquireDocumentWrites(context, {
				collectionKey: data.collectionKey,
				ids: data.documentIds,
			});
			if (claimRes.error) return claimRes;
			await using _claims = claimRes.data;

			const collectionRes = await collections.getSingle(context, {
				key: data.collectionKey,
			});
			if (collectionRes.error) return collectionRes;

			if (collectionRes.data.getData.locked) {
				return {
					error: {
						type: "basic",
						name: copy("server:core.error.locked.collection.name"),
						message: copy("server:core.error.locked.collection.message"),
						status: 400,
					},
					data: undefined,
				};
			}

			if (
				!collectionRes.data.getData.publishing.targets.some(
					(target) => target.key === data.target,
				)
			) {
				return {
					error: {
						type: "basic",
						message: copy("server:core.documents.unpublish.target.invalid"),
						status: 400,
					},
					data: undefined,
				};
			}

			const [accessRes, tablesRes] = await Promise.all([
				checkDocumentAccess(context, {
					collectionKey: data.collectionKey,
					ids: data.documentIds,
				}),
				getTableNames(context, data.collectionKey),
			]);
			if (accessRes.error) return accessRes;
			if (tablesRes.error) return tablesRes;

			const versionsRes = await Versions.selectMultiple(
				{
					select: ["id", "document_id"],
					where: [
						{ key: "document_id", operator: "in", value: data.documentIds },
						{ key: "type", operator: "=", value: data.target },
					],
				},
				{ tableName: tablesRes.data.version },
			);
			if (versionsRes.error) return versionsRes;

			const versions = versionsRes.data ?? [];
			if (versions.length !== new Set(data.documentIds).size) {
				return {
					error: {
						type: "basic",
						message: copy("server:core.documents.unpublish.not.published"),
						status: 404,
					},
					data: undefined,
				};
			}

			const hookRes = await executeHooks(
				context,
				{
					service: "documents",
					event: "beforeUnpublish",
					config: context.config,
					collectionInstance: collectionRes.data,
				},
				{
					meta: {
						collection: collectionRes.data,
						collectionKey: data.collectionKey,
						userId: data.userId,
						collectionTableNames: tablesRes.data,
					},
					data: {
						ids: data.documentIds,
						versionType: data.target,
					},
				},
			);
			if (hookRes.error) return hookRes;

			for (const version of versions) {
				const deleteRes = await Versions.deleteVersions(
					{
						collectionKey: data.collectionKey,
						documentId: version.document_id,
						where: [{ key: "id", operator: "=", value: version.id }],
					},
					{ tableName: tablesRes.data.version },
				);
				if (deleteRes.error) return deleteRes;
			}

			const invalidateRes = await invalidateRequests(context, {
				collectionKey: data.collectionKey,
				documentIds: data.documentIds,
				versionType: data.target,
				requestId: data.requestId,
				userId: data.userId,
			});
			if (invalidateRes.error) return invalidateRes;

			for (const documentId of data.documentIds) {
				const recordRes = await recordTargetChange(context, {
					collectionKey: data.collectionKey,
					documentId,
					target: data.target,
					unpublished: true,
					requestId: data.requestId,
					userId: data.userId,
				});
				if (recordRes.error) return recordRes;
			}

			if (!data.deferEffects) {
				await invalidateContentDocumentCache(context, data.collectionKey);

				const changed = await notifyChange(context, {
					change: { type: "unpublished", version: data.target },
					collectionKey: data.collectionKey,
					ids: data.documentIds,
				});
				if (changed.error) return changed;
			}

			return { error: undefined, data: undefined };
		},
		{ isolate: true },
	);

export default unpublishVersion;
