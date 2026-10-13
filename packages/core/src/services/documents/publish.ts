import constants from "../../constants/constants.js";
import collections from "../../libs/collection/collections.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { copy } from "../../libs/i18n/index.js";
import { getCollectionPermission } from "../../libs/permission/collection-permissions.js";
import hasAccess from "../../libs/permission/has-access.js";
import { DocumentVersionsRepository } from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import canPublishTarget from "../document-workflows/can-publish-target.js";
import validateVersionContent from "../documents-versions/helpers/validate-version-content.js";
import promoteVersion from "../documents-versions/promote-version.js";
import checkDocumentAccess from "./checks/check-document-access.js";
import acquireDocumentWrites from "./helpers/acquire-document-writes.js";
import requiresReview from "./helpers/requires-review.js";

/** Publishes content from latest by default or another environment to a target permitting direct publishing. */
const publish: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			environment: string;
			/** Defaults to latest. */
			sourceVersionId?: number;
			user: LucidUser;
		},
	],
	undefined
> = (context, data) =>
	withTransaction(
		context,
		async (context) => {
			const Versions = new DocumentVersionsRepository(context.db);

			if (
				!hasAccess({
					user: data.user,
					requiredPermissions: [
						getCollectionPermission(data.collectionKey, "read"),
						getCollectionPermission(data.collectionKey, "publish"),
					],
				})
			) {
				return {
					error: {
						type: "basic",
						message: copy("server:core.documents.publish.permission"),
						status: 403,
					},
					data: undefined,
				};
			}

			const collectionRes = await collections.getSingle(context, {
				key: data.collectionKey,
			});
			if (collectionRes.error) return collectionRes;

			const environment =
				collectionRes.data.getData.publishing.environments.find(
					(environment) => environment.key === data.environment,
				);
			if (!environment) {
				return {
					error: {
						type: "basic",
						message: copy("server:core.documents.publish.target.invalid"),
						status: 400,
					},
					data: undefined,
				};
			}

			if (
				requiresReview(collectionRes.data, {
					type: "publish",
					environment: data.environment,
				})
			) {
				return {
					error: {
						type: "basic",
						message: copy("server:core.documents.publish.review.required"),
						status: 403,
					},
					data: undefined,
				};
			}

			const claimRes = await acquireDocumentWrites(context, {
				collectionKey: data.collectionKey,
				ids: [data.documentId],
			});
			if (claimRes.error) return claimRes;
			await using _claims = claimRes.data;

			const accessRes = await checkDocumentAccess(context, {
				collectionKey: data.collectionKey,
				id: data.documentId,
				pending: false,
				deleted: false,
			});
			if (accessRes.error) return accessRes;

			const tablesRes = await getTableNames(context, data.collectionKey);
			if (tablesRes.error) return tablesRes;

			const versionsRes = await Versions.selectMultiple(
				{
					select: ["id", "type", "content_id"],
					where: [
						{ key: "document_id", operator: "=", value: data.documentId },
					],
				},
				{ tableName: tablesRes.data.version },
			);
			if (versionsRes.error) return versionsRes;

			const versions = versionsRes.data ?? [];
			const source = versions.find((version) =>
				data.sourceVersionId === undefined
					? version.type === "latest"
					: version.id === data.sourceVersionId,
			);
			if (!source) {
				return {
					error: {
						type: "basic",
						message: copy("server:core.documents.version.not.found.message"),
						status: 404,
					},
					data: undefined,
				};
			}

			if (
				source.type ===
					constants.collectionBuilder.publishing.proposalVersionType ||
				source.type ===
					constants.collectionBuilder.publishing.snapshotVersionType
			) {
				return {
					error: {
						type: "basic",
						message: copy("server:core.documents.publish.request.version"),
						status: 403,
					},
					data: undefined,
				};
			}

			//* revisions must be restored to latest before publishing
			if (source.type === "revision") {
				return {
					error: {
						type: "basic",
						message: copy("server:core.documents.publish.revision.version"),
						status: 400,
					},
					data: undefined,
				};
			}

			const workflowRes =
				source.type === "latest"
					? await canPublishTarget(context, {
							collectionKey: data.collectionKey,
							documentId: data.documentId,
							target: data.environment,
						})
					: { error: undefined, data: undefined };
			if (workflowRes.error) return workflowRes;

			for (const required of environment.requires) {
				const requiredVersion = versions.find(
					(version) => version.type === required,
				);
				if (requiredVersion?.content_id !== source.content_id) {
					return {
						error: {
							type: "basic",
							message: copy("server:core.documents.publish.requires", {
								data: { target: data.environment, required },
							}),
							status: 409,
						},
						data: undefined,
					};
				}
			}

			const validateRes = await validateVersionContent(context, {
				collection: collectionRes.data,
				documentId: data.documentId,
				versionId: source.id,
				user: data.user,
			});
			if (validateRes.error) return validateRes;

			const promoteRes = await promoteVersion(context, {
				collectionKey: data.collectionKey,
				documentId: data.documentId,
				userId: data.user.id,
				fromVersionId: source.id,
				toVersionType: data.environment,
				skipRevisionCheck: true,
				skipDocumentWriteClaims: true,
			});
			if (promoteRes.error) return promoteRes;

			return { error: undefined, data: undefined };
		},
		{ isolate: true },
	);

export default publish;
