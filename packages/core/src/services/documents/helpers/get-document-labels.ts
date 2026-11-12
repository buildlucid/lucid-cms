import type { CollectionTableNames } from "../../../exports/types.js";
import type CollectionDefinition from "../../../libs/collection/definitions/collection/index.js";
import {
	formatDocumentLabelValue,
	getDocumentLabelField,
} from "../../../libs/collection/helpers/document-label.js";
import prefixGeneratedColName from "../../../libs/collection/helpers/prefix-generated-column-name.js";
import { getDocumentFieldsTableSchema } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { DocumentBricksRepository } from "../../../libs/repositories/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";

/**
 * Reads version labels in one query, preserving input order. Missing labels fall back to the
 * collection name and document ID.
 */
const getDocumentLabels = async <
	const Versions extends ReadonlyArray<{
		documentId: number;
		versionId: number;
	}>,
>(params: {
	context: ServiceContext;
	bricks: DocumentBricksRepository;
	collection: CollectionDefinition;
	tables: CollectionTableNames;
	versions: Versions;
}): ServiceResponse<{ -readonly [Index in keyof Versions]: string }> => {
	const values = new Map<number, string>();
	const fallback = (documentId: number) => {
		const names = params.collection.getData.details.labels;
		const name =
			params.context.translate(names.singular) ||
			params.context.translate(names.plural) ||
			params.collection.key;
		return `${name} #${documentId}`;
	};
	const labelled = () =>
		//* mapping a tuple keeps its length, which TypeScript can't follow through map
		params.versions.map(
			(version) =>
				values.get(version.versionId) ?? fallback(version.documentId),
		) as { -readonly [Index in keyof Versions]: string };

	const labelField = getDocumentLabelField(params.collection);
	if (!labelField || params.versions.length === 0) {
		return { error: undefined, data: labelled() };
	}

	const schemaRes = await getDocumentFieldsTableSchema(
		params.context,
		params.collection.key,
	);
	if (schemaRes.error) return schemaRes;

	const column = prefixGeneratedColName(labelField.key);
	if (!schemaRes.data?.columns.some((schema) => schema.name === column)) {
		return { error: undefined, data: labelled() };
	}

	const valuesRes = await params.bricks.selectColumnByVersionIds(
		{
			versionIds: [
				...new Set(params.versions.map((version) => version.versionId)),
			],
			column,
		},
		{ tableName: params.tables.documentFields },
	);
	if (valuesRes.error) return valuesRes;

	//* a localized label has a row per locale, and the first with a value wins
	for (const row of valuesRes.data) {
		if (values.has(row.document_version_id)) continue;

		const value = formatDocumentLabelValue(labelField, row[column]);
		if (value !== null) values.set(row.document_version_id, value);
	}

	return { error: undefined, data: labelled() };
};

export default getDocumentLabels;
