import { createHash } from "node:crypto";
import collections from "../../../libs/collection/collections.js";
import {
	getBricksTableSchema,
	getTableNames,
} from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import documentBricksFormatter from "../../../libs/formatters/document-bricks.js";
import { copy } from "../../../libs/i18n/index.js";
import { DocumentBricksRepository } from "../../../libs/repositories/index.js";
import { documentEditTokenSchema } from "../../../libs/toolkit/documents/authoring-values-schema.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import fromDocumentInput from "./from-document-input.js";
import prepareDuplicateContent from "./prepare-duplicate-content.js";
import readDocumentState from "./read-document-state.js";

/** Reads persisted authoring content; callers hold a write claim or verify state again after reading. */
const readDocumentContent = async (
	context: ServiceContext,
	input: { collectionKey: string; id: number; allowWriteLock?: boolean },
) => {
	const [state, collection, schema, tables] = await Promise.all([
		readDocumentState(context, input),
		collections.getSingle(context, { key: input.collectionKey }),
		getBricksTableSchema(context, input.collectionKey),
		getTableNames(context, input.collectionKey),
	]);
	if (state.error) return state;
	if (collection.error) return collection;
	if (schema.error) return schema;
	if (tables.error) return tables;

	const DocumentBricks = new DocumentBricksRepository(context.db);
	const rows = await DocumentBricks.selectMultipleByVersionId(
		{ versionId: state.data.version.id, bricksSchema: schema.data },
		{ tableName: tables.data.version },
	);
	if (rows.error) return rows;
	if (!rows.data) {
		return {
			error: {
				status: 404,
				message: copy("server:core.documents.authoring.content.not.found"),
			},
			data: undefined,
		};
	}

	const format = {
		bricksQuery: rows.data,
		collection: collection.data,
		bricksSchema: schema.data,
		config: context.config,
		host: getBaseUrl(context),
		editable: true,
	};
	const stored = prepareDuplicateContent({
		fields: documentBricksFormatter.formatDocumentFields(format),
		bricks: documentBricksFormatter.formatMultiple(format),
	});
	const data = fromDocumentInput(
		{ collection: collection.data, localization: context.config.localization },
		stored,
	);
	if (data.error) return data;

	// Include stored values so reference cleanup also invalidates an earlier edit token.
	const editToken = documentEditTokenSchema.parse(
		createHash("sha256")
			.update(JSON.stringify([state.data.editToken, data.data]))
			.digest("hex"),
	);

	return {
		error: undefined,
		data: {
			...state.data,
			stateToken: state.data.editToken,
			editToken,
			collection: collection.data,
			stored,
			data: data.data,
		},
	};
};

export default readDocumentContent;
