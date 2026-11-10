import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import getContentAccess from "../../../libs/collection/field-access/get-content-access.js";
import type {
	ContentAccess,
	FieldAccessActor,
} from "../../../libs/collection/field-access/types.js";
import type { CollectionSchemaTable } from "../../../libs/collection/schema/types.js";
import type { LucidBrickTableName } from "../../../libs/db/tables/index.js";
import { copy } from "../../../libs/i18n/index.js";
import type {
	QueryParamFilterGroups,
	QueryParamFilters,
} from "../../../types/query-params.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import {
	groupRelationDocumentFilterConditions,
	relationFilterPaths,
} from "../helpers/resolve-relation-document-filters.js";

/** Identifies hidden filter fields in `fields.<field>` or `bricks.<brick>.<field>` form, with relation traversals trimmed to the relation first. */
const isHiddenKey = (access: ContentAccess, key: string) => {
	const [scope, ...path] = key.split(".");

	if (scope === "fields") {
		return path[0] !== undefined && access.fields.get(path[0]) === "hidden";
	}
	if (scope === "bricks" && path[0] !== undefined && path[1] !== undefined) {
		return access.bricks.get(path[0])?.fields.get(path[1]) === "hidden";
	}
	return false;
};

/**
 * Rejects filters and sorts on fields the reader can't see, including in OR groups and in
 * collections reached through relation filters, so listings can't reveal hidden values.
 */
const checkFilterAccess = (props: {
	collection: CollectionBuilder;
	collections: CollectionBuilder[];
	bricksTableSchema: CollectionSchemaTable<LucidBrickTableName>[];
	reader: FieldAccessActor | undefined;
	filter?: QueryParamFilters;
	filterOr?: QueryParamFilterGroups;
	sortKeys?: string[];
}): Awaited<ServiceResponse<undefined>> => {
	if (props.reader === undefined || props.reader.superAdmin) {
		return { error: undefined, data: undefined };
	}

	const conditions = [
		...Object.entries(props.filter ?? {}).map(([key, filter]) => ({
			key,
			...filter,
		})),
		...(props.filterOr ?? []).flat(),
	];
	//* a relation filter's segments after the relation name the target's fields, which are checked against the target
	const relations = relationFilterPaths(
		props.collection,
		props.bricksTableSchema,
	);
	const sourceKey = (key: string) =>
		relations.find((path) => key.startsWith(`${path}.`)) ?? key;

	const checks = [
		{
			access: getContentAccess(props.collection, props.reader),
			keys: [
				...conditions.map((condition) => sourceKey(condition.key)),
				...(props.sortKeys ?? []),
			],
		},
		...groupRelationDocumentFilterConditions({
			collection: props.collection,
			bricksTableSchema: props.bricksTableSchema,
			conditions,
		}).flatMap((pending) => {
			const target = props.collections.find(
				(collection) => collection.key === pending.targetCollectionKey,
			);
			return target
				? [
						{
							access: getContentAccess(target, props.reader),
							keys: pending.conditions.map((condition) => condition.key),
						},
					]
				: [];
		}),
	];

	const hidden = checks
		.flatMap(({ access, keys }) =>
			keys.filter((key) => isHiddenKey(access, key)),
		)
		.at(0);
	if (hidden !== undefined) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.filter.field.hidden", {
					data: { key: hidden },
				}),
				status: 400,
			},
			data: undefined,
		};
	}

	return { error: undefined, data: undefined };
};

export default checkFilterAccess;
