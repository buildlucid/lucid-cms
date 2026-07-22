import registeredFields, {
	registeredFieldTypes,
} from "../../../libs/collection/custom-fields/registered-fields.js";
import {
	createFieldRefFetchPlan,
	type FieldRefFetchInput,
	type FieldRefFetchOutput,
	type FieldRefFetchPlan,
	type FieldRefRelation,
	type FieldRefVersionTypeResolver,
} from "../../../libs/collection/custom-fields/utils/ref-fetch.js";
import buildTableName from "../../../libs/collection/helpers/build-table-name.js";
import type { CollectionSchemaTable } from "../../../libs/collection/schema/types.js";
import type { MediaPropsT } from "../../../libs/formatters/media.js";
import type { UserPropT } from "../../../libs/formatters/users.js";
import { copy } from "../../../libs/i18n/index.js";
import { getCollectionClientScope } from "../../../libs/permission/client-scopes.js";
import type { BrickQueryResponse } from "../../../libs/repositories/document-bricks.js";
import type {
	DocumentVersionType,
	FieldTypes,
	LucidBrickTableName,
	ServiceFn,
} from "../../../types.js";
import type { FieldRelationValues } from "./extract-related-entity-ids.js";

type FieldRefData = Partial<
	Record<
		FieldTypes,
		Array<MediaPropsT> | Array<UserPropT> | Array<BrickQueryResponse>
	>
>;

type RegisteredFieldDefinition = (typeof registeredFields)[FieldTypes];

export type FieldRefResponse = {
	data: FieldRefData;
	meta?: {
		relation?: {
			/** Document-field table schema for referenced relation collections, keyed by collection key. */
			fieldsSchemaByCollection: Record<
				string,
				CollectionSchemaTable<LucidBrickTableName>
			>;
		};
	};
};

type FetchableFieldDefinition = Extract<
	RegisteredFieldDefinition,
	{
		fetchRefs: ServiceFn<[FieldRefFetchInput], FieldRefFetchOutput>;
	}
>;

/**
 * Returns true when a field has a ref fetcher enabled.
 */
const hasRefFetcher = (
	field: RegisteredFieldDefinition,
): field is FetchableFieldDefinition => {
	return field.fetchRefs !== null;
};

/**
 * Returns the field types that are present in the extracted relation values.
 */
const getRequestedFieldTypes = (values: FieldRelationValues): FieldTypes[] => {
	return Object.keys(values).filter((key): key is FieldTypes =>
		registeredFieldTypes.includes(key as FieldTypes),
	);
};

/**
 * Builds the ref fetch plan for a single field type.
 */
const buildFieldRefFetchPlan = (props: {
	fieldType: FieldTypes;
	fieldDefinition: FetchableFieldDefinition;
	relations: FieldRefRelation[];
	versionType: FieldRefFetchInput["versionType"];
	resolveVersionType?: FieldRefVersionTypeResolver;
}): FieldRefFetchPlan | null => {
	return (
		props.fieldDefinition.planFetchRefs?.({
			fieldType: props.fieldType,
			relations: props.relations,
			versionType: props.versionType,
			resolveVersionType: props.resolveVersionType,
			fetchRefs: props.fieldDefinition.fetchRefs,
		}) ??
		createFieldRefFetchPlan({
			fieldType: props.fieldType,
			relations: props.relations,
			versionType: props.versionType,
			resolveVersionType: props.resolveVersionType,
			fetchRefs: props.fieldDefinition.fetchRefs,
		})
	);
};

/**
 * Fetches reference rows for all field types present in the extracted relation values.
 */
const fetchRefData: ServiceFn<
	[
		{
			values: FieldRelationValues;
			versionType: Exclude<DocumentVersionType, "revision">;
			resolveVersionType?: FieldRefVersionTypeResolver;
			allowedDocumentCollectionKeys?: string[];
		},
	],
	FieldRefResponse
> = async (context, data) => {
	if (data.allowedDocumentCollectionKeys !== undefined) {
		const tableToCollection = new Map<string, string>();
		for (const collection of context.config.collections) {
			const tableNameRes = buildTableName(
				"document",
				{ collection: collection.key },
				context.config.db.config.tableNameByteLimit,
			);
			if (tableNameRes.error) return tableNameRes;
			tableToCollection.set(tableNameRes.data.name, collection.key);
		}

		const allowedCollectionKeys = new Set(data.allowedDocumentCollectionKeys);
		const missingCollectionKeys = Array.from(
			new Set(
				(data.values.relation ?? []).flatMap((relation) => {
					const collectionKey = tableToCollection.get(relation.table);
					return collectionKey && !allowedCollectionKeys.has(collectionKey)
						? [collectionKey]
						: [];
				}),
			),
		);
		if (missingCollectionKeys.length > 0) {
			const missingScopes = missingCollectionKeys.map(getCollectionClientScope);
			return {
				error: {
					type: "authorisation",
					name: copy("server:core.client.integrations.scopes.error.name"),
					message: copy(
						"server:core.client.integrations.scopes.missing.message",
						{
							data: {
								requiredScopes: missingScopes.join(", "),
								missingScopes: missingScopes.join(", "),
							},
						},
					),
					status: 403,
				},
				data: undefined,
			};
		}
	}

	const response: FieldRefResponse = {
		data: {},
	};

	const fetchPlans = getRequestedFieldTypes(data.values).flatMap(
		(fieldType) => {
			const relationValues = data.values[fieldType];
			const fieldDefinition = registeredFields[fieldType];
			if (!relationValues || relationValues.length === 0) return [];
			if (!hasRefFetcher(fieldDefinition)) return [];

			const plan = buildFieldRefFetchPlan({
				fieldType,
				fieldDefinition,
				relations: relationValues,
				versionType: data.versionType,
				resolveVersionType: data.resolveVersionType,
			});
			return plan ? [plan] : [];
		},
	);

	const fetchResults = await Promise.all(
		fetchPlans.map(async (plan) => ({
			fieldType: plan.fieldType,
			res: await plan.run(context),
		})),
	);

	for (const { fieldType, res } of fetchResults) {
		if (res.error) {
			return {
				data: undefined,
				error: res.error,
			};
		}
		if (!res.data) continue;

		response.data[fieldType] = res.data.rows;
		if (res.data.meta?.relation) {
			response.meta = {
				...response.meta,
				relation: {
					fieldsSchemaByCollection: {
						...(response.meta?.relation?.fieldsSchemaByCollection || {}),
						...res.data.meta.relation.fieldsSchemaByCollection,
					},
				},
			};
		}
	}

	return {
		data: response,
		error: undefined,
	};
};

export default fetchRefData;
