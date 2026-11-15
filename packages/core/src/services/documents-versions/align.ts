import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import { DocumentVersionsRepository } from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import acquireDocumentWrites from "../documents/helpers/acquire-document-writes.js";
import createRequest, {
	type RequestDetailsInput,
} from "../requests/create-single.js";
import changesContent from "../requests/helpers/changes-content.js";
import getProposalVersionId from "../requests/helpers/get-proposal-version-id.js";
import getUpdateContext from "./helpers/get-update-context.js";
import readVersionContent from "./helpers/read-version-content.js";
import promoteVersion from "./promote-version.js";
import updateSingle from "./update-single.js";

/**
 * Replaces latest or a proposal with another version's content, keeping its
 * workflow unless its stage has `resetTo`. Latest can align with an
 * environment, and proposals with an environment or latest, while a publish
 * request's copy of latest can only be refreshed from latest. The content IDs
 * both sides were compared at must still match, so nothing changed in between
 * is overwritten. With `request`, latest is aligned by proposing it in a new
 * update request instead, which collections that review updates require.
 */
const align: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			versionId: number;
			source: string;
			sourceContentId: string;
			destinationContentId: string;
			user: LucidUser;
			/** Aligns a new update request's proposal of latest instead of latest itself. */
			request?: RequestDetailsInput;
		},
	],
	{ requestId: number | null }
> = (context, data) =>
	withTransaction(
		context,
		async (context) => {
			const Versions = new DocumentVersionsRepository(context.db);

			const claimRes = await acquireDocumentWrites(context, {
				collectionKey: data.collectionKey,
				ids: [data.documentId],
			});
			if (claimRes.error) return claimRes;
			await using _claims = claimRes.data;

			//* the new proposal copies latest, so it starts with the content that was compared
			let versionId = data.versionId;
			let requestId: number | null = null;
			if (data.request) {
				const createdRes = await createRequest(context, {
					type: "update",
					...data.request,
					documents: [
						{ collectionKey: data.collectionKey, documentId: data.documentId },
					],
					user: data.user,
					skipDocumentWriteClaims: true,
				});
				if (createdRes.error) return createdRes;

				const versionIdRes = await getProposalVersionId(context, {
					requestId: createdRes.data.id,
					collectionKey: data.collectionKey,
					documentId: data.documentId,
				});
				if (versionIdRes.error) return versionIdRes;

				requestId = createdRes.data.id;
				versionId = versionIdRes.data;
			}

			const updateContextRes = await getUpdateContext(context, {
				...data,
				versionId,
				authUser: data.user,
				purpose: "align",
			});
			if (updateContextRes.error) return updateContextRes;

			//* a publish request's copy of latest is only ever refreshed from latest, and becomes latest exactly
			const request = updateContextRes.data.request;
			const refreshing = request !== undefined && !changesContent(request.type);
			const allowedSource = refreshing
				? data.source === "latest"
				: updateContextRes.data.collection.getData.publishing.environments.some(
						(environment) => environment.key === data.source,
					) ||
					(updateContextRes.data.versionType ===
						constants.collectionBuilder.publishing.proposalVersionType &&
						data.source === "latest");
			if (!allowedSource) {
				return {
					error: {
						type: "basic",
						message: copy("server:core.documents.align.source.invalid"),
						status: 400,
					},
					data: undefined,
				};
			}

			const [sourceRes, destinationRes] = await Promise.all([
				readVersionContent(context, {
					collectionKey: data.collectionKey,
					documentId: data.documentId,
					versionType: data.source,
				}),
				readVersionContent(context, {
					collectionKey: data.collectionKey,
					documentId: data.documentId,
					versionId,
				}),
			]);
			if (sourceRes.error) return sourceRes;
			if (destinationRes.error) return destinationRes;

			const source = sourceRes.data;
			const destination = destinationRes.data;
			if (
				!source ||
				!destination ||
				source.contentId !== data.sourceContentId ||
				destination.contentId !== data.destinationContentId
			) {
				return {
					error: {
						type: "basic",
						message: copy("server:core.documents.align.changed"),
						status: 409,
					},
					data: undefined,
				};
			}

			//* promoted and cloned versions share a content ID until either is edited
			if (source.contentId === destination.contentId) {
				return { error: undefined, data: { requestId } };
			}

			if (destination.type === "latest") {
				const promoteRes = await promoteVersion(context, {
					collectionKey: data.collectionKey,
					documentId: data.documentId,
					fromVersionId: source.id,
					toVersionType: "latest",
					userId: data.user.id,
					skipDocumentWriteClaims: true,
				});
				if (promoteRes.error) return promoteRes;

				return { error: undefined, data: { requestId } };
			}

			//* a refreshed copy takes every field, whatever fields the person can edit
			const updateRes = await updateSingle(context, {
				collectionKey: data.collectionKey,
				documentId: data.documentId,
				versionId,
				userId: data.user.id,
				authUser: refreshing ? undefined : data.user,
				skipDocumentWriteClaims: true,
				purpose: "align",
				exact: refreshing,
				...source.content,
			});
			if (updateRes.error) return updateRes;

			//* it then holds latest's content, so it shares its content ID like a fresh copy and refreshing again changes nothing
			if (refreshing) {
				const sharedRes = await Versions.updateSingle(
					{
						where: [{ key: "id", operator: "=", value: versionId }],
						data: { content_id: source.contentId },
					},
					{ tableName: updateContextRes.data.tableNames.version },
				);
				if (sharedRes.error) return sharedRes;
			}

			return { error: undefined, data: { requestId } };
		},
		{ isolate: true },
	);

export default align;
