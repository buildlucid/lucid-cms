import constants from "../../constants/constants.js";
import type { InternalCollectionDocument, Refs } from "../../exports/types.js";
import collections from "../../libs/collection/collections.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { DocumentVersionType } from "../../libs/db/tables/index.js";
import { documentsFormatter } from "../../libs/formatters/index.js";
import executeHooks from "../../libs/hooks/execute-hooks.js";
import { copy } from "../../libs/i18n/index.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import type { GetSingleQueryParams } from "../../schemas/documents.js";
import type { LucidUser } from "../../types/hono.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getDocumentWorkflow from "../document-workflows/get-single.js";
import getDocumentBricks from "../documents-bricks/get-multiple.js";
import checkRequestVersionAccess from "../requests/helpers/check-request-version-access.js";
import collectDocumentRefTargets from "./helpers/collect-document-ref-targets.js";
import resolveDocumentIncludes from "./helpers/resolve-document-includes.js";
import resolveRelationVersionType from "./helpers/resolve-relation-version-type.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
			version?: DocumentVersionType;
			versionId?: number;
			collectionKey: string;
			query: GetSingleQueryParams;
			/** Required to read request proposals and snapshots. */
			authUser?: LucidUser;
		},
	],
	{
		document: InternalCollectionDocument;
		refs?: Refs;
	}
> = async (context, data) => {
	const Document = new DocumentsRepository(context.db);

	//* request proposals and snapshots are only addressable by their version ID
	if (
		data.version ===
			constants.collectionBuilder.publishing.snapshotVersionType ||
		data.version === constants.collectionBuilder.publishing.proposalVersionType
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.version.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const collectionRes = await collections.getSingle(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	const documentRes = await Document.selectSingleById(
		{
			id: data.id,
			tables: {
				versions: tableNamesRes.data.version,
			},
			version: data.version,
			versionId: data.versionId,
			validation: {
				enabled: true,
				defaultError: {
					message: copy("server:core.documents.version.not.found.message"),
					status: 404,
				},
			},
		},
		{
			tableName: tableNamesRes.data.document,
		},
	);
	if (documentRes.error) return documentRes;

	const versionId = documentRes.data.version_id;
	const versionType = documentRes.data.version_type;
	const workflowRes =
		versionId &&
		(versionType === "latest" ||
			versionType ===
				constants.collectionBuilder.publishing.proposalVersionType)
			? await getDocumentWorkflow(context, {
					collectionKey: data.collectionKey,
					documentId: data.id,
					versionId: versionType === "latest" ? null : versionId,
				})
			: { error: undefined, data: null };
	if (workflowRes.error) return workflowRes;

	if (!versionId || !versionType) {
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
		versionType ===
			constants.collectionBuilder.publishing.snapshotVersionType ||
		versionType === constants.collectionBuilder.publishing.proposalVersionType
	) {
		const accessRes = await checkRequestVersionAccess(context, {
			collectionKey: data.collectionKey,
			documentId: data.id,
			versionId,
			user: data.authUser,
		});
		if (accessRes.error) return accessRes;
	}

	const relationVersionTypeRes = await resolveRelationVersionType(context, {
		collectionKey: documentRes.data.collection_key,
		documentId: data.id,
		versionId,
		versionType,
	});
	if (relationVersionTypeRes.error) return relationVersionTypeRes;

	let document: InternalCollectionDocument;
	const include = resolveDocumentIncludes(data.query.include);
	const fetchRouteFields = collectionRes.data.getData.routing !== null;
	let refs: Refs | undefined;

	if (include.bricks || include.refs !== null || fetchRouteFields) {
		const bricksRes = await getDocumentBricks(context, {
			versionId: versionId,
			collectionKey: documentRes.data.collection_key,
			versionType: relationVersionTypeRes.data.versionType,
			resolveVersionType: relationVersionTypeRes.data.resolveVersionType,
			includeBricks: include.bricks,
			refResources: include.refs,
			refTargets: collectDocumentRefTargets({
				documents: [documentRes.data],
				includeMeta: true,
				workflows: [workflowRes.data],
			}),
		});
		if (bricksRes.error) return bricksRes;

		document = documentsFormatter.formatSingle({
			document: documentRes.data,
			collection: collectionRes.data,
			bricks: bricksRes.data.bricks,
			fields: bricksRes.data.fields,
			config: context.config,
			host: getBaseUrl(context),
			mediaOptions: {
				host: getBaseUrl(context),
				delivery: context.mediaDelivery,
				defaultLocale: context.config.localization.defaultLocale,
				locales: context.config.localization.locales,
			},
			workflow: workflowRes.data,
		});
		refs = include.refs !== null ? (bricksRes.data.refs ?? {}) : undefined;
	} else {
		document = documentsFormatter.formatSingle({
			document: documentRes.data,
			collection: collectionRes.data,
			bricks: [],
			fields: [],
			config: context.config,
			host: getBaseUrl(context),
			mediaOptions: {
				host: getBaseUrl(context),
				delivery: context.mediaDelivery,
				defaultLocale: context.config.localization.defaultLocale,
				locales: context.config.localization.locales,
			},
			workflow: workflowRes.data,
		});
	}
	if (!include.bricks && include.refs === null) {
		document.bricks = [];
		document.fields = [];
	}

	const afterFetchRes = await executeHooks(
		context,
		{
			service: "documents",
			event: "afterFetch",
			config: context.config,
			collectionInstance: collectionRes.data,
		},
		{
			meta: {
				collection: collectionRes.data,
				collectionKey: documentRes.data.collection_key,
				collectionTableNames: tableNamesRes.data,
			},
			data: {
				versionType,
				relationVersionType: relationVersionTypeRes.data.versionType,
				documents: [document],
			},
		},
	);
	if (afterFetchRes.error) return afterFetchRes;

	return {
		error: undefined,
		data: {
			document: afterFetchRes.data.documents[0] ?? document,
			refs,
		},
	};
};

export default getSingle;
