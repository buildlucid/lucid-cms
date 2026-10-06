import type { RichTextJSON } from "@lucidcms/rich-text";
import constants from "../../constants/constants.js";
import collections from "../../libs/collection/collections.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { copy } from "../../libs/i18n/index.js";
import { getCollectionPermission } from "../../libs/permission/collection-permissions.js";
import hasAccess from "../../libs/permission/has-access.js";
import {
	DocumentVersionsRepository,
	ReleaseDocumentsRepository,
	ReleasesRepository,
} from "../../libs/repositories/index.js";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import saveDocument from "../documents/helpers/save-document.js";
import createTargets from "./helpers/create-targets.js";
import resolveMentions from "./helpers/resolve-mentions.js";
import setReviewers from "./helpers/set-reviewers.js";

/**
 * Requests a new document through a create release. The document's content
 * is saved as the release's proposal, so it stays out of document lists and
 * content until the release is approved and released into latest. Callers
 * own the transaction.
 */
const requestCreation: ServiceFn<
	[
		{
			collectionKey: string;
			title: string;
			description?: RichTextJSON | null;
			reviewerIds?: number[];
			bricks?: Array<BrickInputSchema>;
			fields?: Array<FieldInputSchema>;
			user: LucidUser;
		},
	],
	{ id: number; releaseId: number }
> = async (context, data) => {
	const Releases = new ReleasesRepository(context.db);
	const ReleaseDocuments = new ReleaseDocumentsRepository(context.db);
	const Versions = new DocumentVersionsRepository(context.db);

	if (
		!hasAccess({
			user: data.user,
			optionalPermissions: [
				getCollectionPermission(data.collectionKey, "create"),
				getCollectionPermission(data.collectionKey, "create-request"),
			],
		})
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.create.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	const collectionRes = await collections.getSingle(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	if (collectionRes.data.getData.mode !== "multiple") {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.create.collection"),
				status: 400,
			},
			data: undefined,
		};
	}

	const descriptionRes = data.description
		? await resolveMentions(context, {
				release: { documents: [{ collection_key: data.collectionKey }] },
				body: data.description,
			})
		: undefined;
	if (descriptionRes?.error) return descriptionRes;

	const now = new Date().toISOString();
	const releaseRes = await Releases.createSingle({
		data: {
			type: "create",
			title: data.title,
			description: descriptionRes?.data ?? null,
			status: "open",
			revision: 1,
			created_by: data.user.id,
			created_at: now,
			updated_at: now,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	if (releaseRes.error) return releaseRes;

	const documentRes = await saveDocument(context, {
		collectionKey: data.collectionKey,
		userId: data.user.id,
		authUser: data.user,
		bricks: data.bricks,
		fields: data.fields,
		createReleaseId: releaseRes.data.id,
	});
	if (documentRes.error) return documentRes;

	const tablesRes = await getTableNames(context, data.collectionKey);
	if (tablesRes.error) return tablesRes;

	const proposalRes = await Versions.selectSingle(
		{
			select: ["id"],
			where: [
				{ key: "document_id", operator: "=", value: documentRes.data },
				{
					key: "type",
					operator: "=",
					value: constants.collectionBuilder.publishing.proposalVersionType,
				},
			],
			validation: { enabled: true },
		},
		{ tableName: tablesRes.data.version },
	);
	if (proposalRes.error) return proposalRes;

	const releaseDocumentRes = await ReleaseDocuments.createSingle({
		data: {
			release_id: releaseRes.data.id,
			collection_key: data.collectionKey,
			document_id: documentRes.data,
			source: "latest",
			source_version_id: proposalRes.data.id,
			approved_version_id: null,
			approved_workflow_stage: null,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	if (releaseDocumentRes.error) return releaseDocumentRes;

	const targetsRes = await createTargets(context, {
		releaseDocumentId: releaseDocumentRes.data.id,
		targets: ["latest"],
	});
	if (targetsRes.error) return targetsRes;

	if (data.reviewerIds?.length) {
		const reviewersRes = await setReviewers(context, {
			release: {
				id: releaseRes.data.id,
				type: "create",
				created_by: data.user.id,
				documents: [{ collection_key: data.collectionKey }],
				reviewers: [],
			},
			reviewerIds: data.reviewerIds,
			userId: data.user.id,
		});
		if (reviewersRes.error) return reviewersRes;
	}

	return {
		error: undefined,
		data: { id: documentRes.data, releaseId: releaseRes.data.id },
	};
};

export default requestCreation;
