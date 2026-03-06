import registeredFields, {
	registeredFieldTypes,
} from "../../../libs/collection/custom-fields/registered-fields.js";
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

export type FieldRefFetchInput = {
	relations: Array<{
		table: string;
		values: Set<unknown>;
	}>;
	versionType: Exclude<DocumentVersionType, "revision">;
};

export type FieldRefFetchOutput = {
	rows: Array<MediaPropsT> | Array<UserPropT> | Array<BrickQueryResponse>;
	meta?: {
		document?: {
			fieldsSchemaByCollection: Record<
				string,
				CollectionSchemaTable<LucidBrickTableName>
			>;
		};
	};
};

type FieldRefData = Partial<
	Record<
		FieldTypes,
		Array<MediaPropsT> | Array<UserPropT> | Array<BrickQueryResponse>
	>
>;

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

/**
 * Returns true when a field has a ref fetcher enabled.
 */
const hasRefFetcher = (
	field: (typeof registeredFields)[FieldTypes],
): field is
	| (typeof registeredFields)["media"]
	| (typeof registeredFields)["user"]
	| (typeof registeredFields)["document"] => {
	return field.fetchRefs !== null;
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

	for (const fieldType of registeredFieldTypes) {
		const relationValues = data.values[fieldType];
		const fieldDefinition = registeredFields[fieldType];
		if (!relationValues || relationValues.length === 0) continue;
		if (!hasRefFetcher(fieldDefinition)) continue;

		const res = await fieldDefinition.fetchRefs(context, {
			relations: relationValues,
			versionType: data.versionType,
		});
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
					fieldsSchemaByCollection:
						res.data.meta.document.fieldsSchemaByCollection,
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
