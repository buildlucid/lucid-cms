import registeredFields, {
	registeredFieldTypes,
} from "../../../libs/collection/custom-fields/registered-fields.js";
import {
	createFieldRefFetchPlan,
	type FieldRefFetchInput,
	type FieldRefFetchOutput,
	type FieldRefFetchPlan,
	type FieldRefRelation,
} from "../../../libs/collection/custom-fields/utils/ref-fetch.js";
import type { CollectionSchemaTable } from "../../../libs/collection/schema/types.js";
import type { MediaPropsT } from "../../../libs/formatters/media.js";
import type { UserPropT } from "../../../libs/formatters/users.js";
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
		document?: {
			/** Document-field table schema for referenced collections, keyed by collection key. */
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
}): FieldRefFetchPlan | null => {
	return (
		props.fieldDefinition.planFetchRefs?.({
			fieldType: props.fieldType,
			relations: props.relations,
			versionType: props.versionType,
			fetchRefs: props.fieldDefinition.fetchRefs,
		}) ??
		createFieldRefFetchPlan({
			fieldType: props.fieldType,
			relations: props.relations,
			versionType: props.versionType,
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
		},
	],
	FieldRefResponse
> = async (context, data) => {
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
		if (res.data.meta?.document) {
			response.meta = {
				...response.meta,
				document: {
					fieldsSchemaByCollection: {
						...(response.meta?.document?.fieldsSchemaByCollection || {}),
						...res.data.meta.document.fieldsSchemaByCollection,
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
