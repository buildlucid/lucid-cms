import type { CollectionBuilder } from "@lucidcms/core";
import type {
	CollectionTableNames,
	ServiceFn,
	Toolkit,
} from "@lucidcms/core/types";
import constants from "../../../constants.js";
import type { CollectionConfig, RouteScope } from "../../../types/types.js";
import fieldResToSchema from "../../../utils/field-res-to-schema.js";
import getParentPageId from "../../../utils/get-parent-page-id.js";
import resolvePagesCollectionLocalization from "../../../utils/resolve-pages-collection-localization.js";
import {
	checkCircularParents,
	checkFieldsExist,
	checkPathUniqueness,
} from "../../checks/index.js";
import getPagesFields from "../../get-pages-fields.js";
import setPath from "../../set-path.js";
import updateRouteFields from "../../update-route-fields.js";
import buildDescendantPaths from "./build-descendant-paths.js";
import resolveParentPath from "./resolve-parent-path.js";

/**
 * Recomputes a version's route and writable descendants after promotion, capture, restoration or
 * removal of a request parent.
 */
const refreshVersionRoute: ServiceFn<
	[
		{
			collection: CollectionConfig;
			collectionInstance: CollectionBuilder;
			tables: CollectionTableNames;
			toolkit: Toolkit;
			scope: RouteScope;
			documentId: number;
			versionId: number;
		},
	],
	undefined
> = async (context, data) => {
	const localization = resolvePagesCollectionLocalization({
		localization: context.config.localization,
		collection: data.collection,
		collectionInstance: data.collectionInstance,
	});

	const versionFieldsRes = await getPagesFields(context, {
		collectionKey: data.collection.key,
		scope: data.scope,
		tables: data.tables,
		versionIds: [data.versionId],
	});
	if (versionFieldsRes.error) return versionFieldsRes;
	const rows = versionFieldsRes.data[0]?.rows;
	//* a version without route fields has nothing to recompute
	if (!rows) return { error: undefined, data: undefined };

	const checkFieldsExistRes = checkFieldsExist({
		fields: {
			slug: fieldResToSchema(
				constants.fields.slug.key,
				data.collection.localized,
				localization,
				rows,
			),
			parentPage: fieldResToSchema(
				constants.fields.parentPage.key,
				false,
				localization,
				rows,
				data.collection.key,
			),
			path: fieldResToSchema(
				constants.fields.path.key,
				data.collection.localized,
				localization,
				rows,
			),
		},
	});
	if (checkFieldsExistRes.error) return checkFieldsExistRes;
	const { slug, parentPage, path } = checkFieldsExistRes.data;

	if (getParentPageId(parentPage) !== null) {
		const circularParentsRes = await checkCircularParents(context, {
			documentId: data.documentId,
			scope: data.scope,
			collectionKey: data.collection.key,
			fields: { parentPage },
			tables: data.tables,
		});
		if (circularParentsRes.error) return circularParentsRes;
	}

	const pathRes = await resolveParentPath(context, {
		collection: data.collection,
		collectionInstance: data.collectionInstance,
		scope: data.scope,
		tables: data.tables,
		fields: { slug, parentPage, all: [slug, parentPage, path] },
		documentVersionId: data.versionId,
	});
	if (pathRes.error) return pathRes;

	setPath({
		path: pathRes.data,
		localization,
		fields: { path },
	});

	const descendantsRes = await buildDescendantPaths(context, {
		documentIds: [data.documentId],
		scope: data.scope,
		tables: data.tables,
		collection: data.collection,
		collectionInstance: data.collectionInstance,
		parentPathField: path,
	});
	if (descendantsRes.error) return descendantsRes;

	const projectedPaths = [
		{
			documentId: data.documentId,
			versionId: data.versionId,
			values: pathRes.data,
		},
		...descendantsRes.data,
	];
	const uniquenessRes = await checkPathUniqueness(context, {
		collection: data.collection,
		projectedPaths,
		scope: data.scope,
		tables: data.tables,
		excludeDocumentIds: projectedPaths.map((doc) => doc.documentId),
	});
	if (uniquenessRes.error) return uniquenessRes;

	//* promoted and captured slugs are stored as typed, so normalise them like a save would
	const updateSlugRes = await updateRouteFields(context, {
		toolkit: data.toolkit,
		collection: data.collection,
		field: "slug",
		scope: data.scope,
		values: [
			{
				documentId: data.documentId,
				versionId: data.versionId,
				values: slug.translations
					? new Map(Object.entries(slug.translations))
					: new Map([[null, slug.value ?? null]]),
			},
		],
		tables: data.tables,
	});
	if (updateSlugRes.error) return updateSlugRes;

	return updateRouteFields(context, {
		toolkit: data.toolkit,
		collection: data.collection,
		field: "path",
		scope: data.scope,
		excludeDocumentIds: [data.documentId],
		values: projectedPaths,
		tables: data.tables,
	});
};

export default refreshVersionRoute;
