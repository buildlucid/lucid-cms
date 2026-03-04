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
	LucidDocumentTableName,
	ServiceFn,
} from "../../../types.js";
import type { FieldRelationValues } from "./extract-related-entity-ids.js";

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
 * Responsible for fetching all of the reference data for a document based on what is extracted from field data and config
 */
const isLucidDocumentTableName = (
	tableName: string,
): tableName is LucidDocumentTableName => {
	return tableName.startsWith("lucid_doc__");
};

const hasIdRefFetcher = (
	field: (typeof registeredFields)[FieldTypes],
): field is
	| (typeof registeredFields)["media"]
	| (typeof registeredFields)["user"] => {
	return field.config.refs?.fetchMode === "ids" && field.fetchRefs !== null;
};

const hasDocumentRefFetcher = (
	field: (typeof registeredFields)[FieldTypes],
): field is (typeof registeredFields)["document"] => {
	return (
		field.config.refs?.fetchMode === "document-values" &&
		field.fetchRefs !== null
	);
};

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
	const fetchPromises: Promise<unknown>[] = [];

	let firstError = false;
	// let responseError: LucidErrorData;

	for (const fieldType of registeredFieldTypes) {
		const relationValues = data.values[fieldType];
		const fieldDefinition = registeredFields[fieldType];
		if (!relationValues || relationValues.length === 0) continue;

		if (hasIdRefFetcher(fieldDefinition)) {
			const ids = relationValues
				.flatMap((entry) => Array.from(entry.values))
				.filter((value) => typeof value === "number");

			fetchPromises.push(
				fieldDefinition
					.fetchRefs(context, {
						ids: ids,
					})
					.then((res) => {
						if (res.error && !firstError) {
							firstError = true;
							return;
						}

						if (res.data && Array.isArray(res.data)) {
							response.data[fieldType] = res.data;
						}
					}),
			);
			continue;
		}

		if (!hasDocumentRefFetcher(fieldDefinition)) continue;

		const values = relationValues.flatMap((entry) => {
			if (!isLucidDocumentTableName(entry.table)) return [];

			const ids = Array.from(entry.values).filter(
				(value) => typeof value === "number",
			);
			return [
				{
					table: entry.table,
					ids: ids,
				},
			];
		});

		fetchPromises.push(
			fieldDefinition
				.fetchRefs(context, {
					values: values,
					versionType: data.versionType,
				})
				.then((res) => {
					if (res.error && !firstError) {
						firstError = true;
						return;
					}

					if (!res.data) return;

					response.data[fieldType] = res.data.rows;
					response.meta = {
						...response.meta,
						document: {
							fieldsSchemaByCollection: res.data.fieldsSchemaByCollection,
						},
					};
				}),
		);
	}

	await Promise.all(fetchPromises);

	return {
		data: response,
		error: undefined,
	};
};

export default fetchRefData;
