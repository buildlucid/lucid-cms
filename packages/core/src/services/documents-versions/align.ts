import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import acquireDocumentWrites from "../documents/helpers/acquire-document-writes.js";
import getUpdateContext from "./helpers/get-update-context.js";
import readVersionContent from "./helpers/read-version-content.js";
import promoteVersion from "./promote-version.js";
import updateSingle from "./update-single.js";

/**
 * Replaces latest or a proposal with another version's content, keeping its
 * workflow. Latest can align with an environment, and proposals with an
 * environment or latest. The content IDs both sides were compared at must
 * still match, so nothing changed in between is overwritten.
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
		},
	],
	undefined
> = (context, data) =>
	withTransaction(
		context,
		async (context) => {
			const claimRes = await acquireDocumentWrites(context, {
				collectionKey: data.collectionKey,
				ids: [data.documentId],
			});
			if (claimRes.error) return claimRes;
			await using _claims = claimRes.data;

			const updateContextRes = await getUpdateContext(context, {
				...data,
				authUser: data.user,
			});
			if (updateContextRes.error) return updateContextRes;

			const allowedSource =
				updateContextRes.data.collection.getData.publishing.targets.some(
					(target) => target.key === data.source,
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
					versionId: data.versionId,
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
				return { error: undefined, data: undefined };
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

				return { error: undefined, data: undefined };
			}

			const updateRes = await updateSingle(context, {
				collectionKey: data.collectionKey,
				documentId: data.documentId,
				versionId: data.versionId,
				userId: data.user.id,
				authUser: data.user,
				skipDocumentWriteClaims: true,
				...source.content,
			});
			if (updateRes.error) return updateRes;

			return { error: undefined, data: undefined };
		},
		{ isolate: true },
	);

export default align;
