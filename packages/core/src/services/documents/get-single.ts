import constants from "../../constants/constants.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { DocumentVersionType } from "../../libs/db/types.js";
import { documentsFormatter } from "../../libs/formatters/index.js";
import executeHooks from "../../libs/hooks/execute-hooks.js";
import { copy } from "../../libs/i18n/index.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import type { GetSingleQueryParams } from "../../schemas/documents.js";
import type { InternalCollectionDocument } from "../../types.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import {
	collectionServices,
	documentBrickServices,
	documentWorkflowServices,
} from "../index.js";
import resolveRelationVersionType from "./helpers/resolve-relation-version-type.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
			status?: DocumentVersionType;
			versionId?: number;
			collectionKey: string;
			query: GetSingleQueryParams;
		},
	],
	InternalCollectionDocument
> = async (context, data) => {
	const Document = new DocumentsRepository(
		context.db.client,
		context.config.db,
	);

	if (
		data.status === constants.collectionBuilder.publishing.snapshotVersionType
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

	const collectionRes = collectionServices.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	const [documentRes, workflowRes] = await Promise.all([
		Document.selectSingleById(
			{
				id: data.id,
				tables: {
					versions: tableNamesRes.data.version,
				},
				status: data.status,
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
		),
		documentWorkflowServices.getSingle(context, {
			collectionKey: data.collectionKey,
			documentId: data.id,
		}),
	]);
	if (documentRes.error) return documentRes;
	if (workflowRes.error) return workflowRes;

	const versionId =
		data.status !== undefined ? documentRes.data.version_id : data.versionId;
	const versionType =
		data.status !== undefined ? data.status : documentRes.data.version_type;

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

	const relationVersionTypeRes = await resolveRelationVersionType(context, {
		collectionKey: documentRes.data.collection_key,
		documentId: data.id,
		versionId,
		versionType,
	});
	if (relationVersionTypeRes.error) return relationVersionTypeRes;

	let document: InternalCollectionDocument;

	if (data.query.include?.includes("bricks")) {
		const bricksRes = await documentBrickServices.getMultiple(context, {
			versionId: versionId,
			collectionKey: documentRes.data.collection_key,
			versionType: relationVersionTypeRes.data.versionType,
			resolveVersionType: relationVersionTypeRes.data.resolveVersionType,
		});
		if (bricksRes.error) return bricksRes;

		document = documentsFormatter.formatSingle({
			document: documentRes.data,
			collection: collectionRes.data,
			bricks: bricksRes.data.bricks,
			fields: bricksRes.data.fields,
			config: context.config,
			host: getBaseUrl(context),
			refs: bricksRes.data.refs,
			workflow: workflowRes.data,
		});
	} else {
		document = documentsFormatter.formatSingle({
			document: documentRes.data,
			collection: collectionRes.data,
			bricks: [],
			fields: [],
			config: context.config,
			host: getBaseUrl(context),
			workflow: workflowRes.data,
		});
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
		data: afterFetchRes.data.documents[0] ?? document,
	};
};

export default getSingle;
