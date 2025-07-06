import T from "../../../../translations/index.js";
import getSchema from "./get-schema.js";
import type { ServiceContext } from "../../../../utils/services/types.js";
import type { CollectionSchemaTable } from "../types.js";
import type {
	LucidBrickTableName,
	LucidDocumentTableName,
	LucidVersionTableName,
	ServiceResponse,
	CollectionTableNames,
} from "../../../../types.js";

/**
 * Returns the schema for the bricks table for a given collection.
 * - document-fields
 * - repeater
 * - brick
 */
export const getBricksTableSchema = async (
	context: ServiceContext,
	collectionKey: string,
): ServiceResponse<Array<CollectionSchemaTable<LucidBrickTableName>>> => {
	const schemaRes = await getSchema(context, { collectionKey });
	if (schemaRes.error) return schemaRes;

	return {
		error: undefined,
		data: schemaRes.data.tables.filter(
			(table) => table.type !== "document" && table.type !== "versions",
		) as Array<CollectionSchemaTable<LucidBrickTableName>>,
	};
};

/**
 * Returns the schema for the document table for a given collection.
 * - document
 */
export const getDocumentTableSchema = async (
	context: ServiceContext,
	collectionKey: string,
): ServiceResponse<
	CollectionSchemaTable<LucidDocumentTableName> | undefined
> => {
	const schema = await getSchema(context, { collectionKey });
	if (schema.error) return schema;

	return {
		error: undefined,
		data: schema.data.tables.find((t) => t.type === "document") as
			| CollectionSchemaTable<LucidDocumentTableName>
			| undefined,
	};
};

/**
 * Returns the schema for the document fields table for a given collection.
 * - document-fields
 */
export const getDocumentFieldsTableSchema = async (
	context: ServiceContext,
	collectionKey: string,
): ServiceResponse<CollectionSchemaTable<LucidBrickTableName> | undefined> => {
	const schemaRes = await getSchema(context, { collectionKey });
	if (schemaRes.error) return schemaRes;

	return {
		error: undefined,
		data: schemaRes.data.tables.find((t) => t.type === "document-fields") as
			| CollectionSchemaTable<LucidBrickTableName>
			| undefined,
	};
};

/**
 * Returns the schema for the document version table for a given collection.
 * - versions
 */
export const getDocumentVersionTableSchema = async (
	context: ServiceContext,
	collectionKey: string,
): ServiceResponse<
	CollectionSchemaTable<LucidVersionTableName> | undefined
> => {
	const schemaRes = await getSchema(context, { collectionKey });
	if (schemaRes.error) return schemaRes;

	return {
		error: undefined,
		data: schemaRes.data.tables.find((t) => t.type === "versions") as
			| CollectionSchemaTable<LucidVersionTableName>
			| undefined,
	};
};

/**
 * Returns the names of the tables for a given collection.
 * - version
 * - document
 * - document-fields
 */
export const getTableNames = async (
	context: ServiceContext,
	collectionKey: string,
): ServiceResponse<CollectionTableNames> => {
	const [versionTableRes, documentTableRes, documentFieldsRes] =
		await Promise.all([
			getDocumentVersionTableSchema(context, collectionKey),
			getDocumentTableSchema(context, collectionKey),
			getDocumentFieldsTableSchema(context, collectionKey),
		]);
	if (versionTableRes.error) return versionTableRes;
	if (documentTableRes.error) return documentTableRes;
	if (documentFieldsRes.error) return documentFieldsRes;

	if (
		!versionTableRes.data?.name ||
		!documentTableRes.data?.name ||
		!documentFieldsRes.data?.name
	) {
		return {
			error: {
				message: T("error_getting_collection_names"),
				status: 500,
			},
			data: undefined,
		};
	}

	return {
		data: {
			version: versionTableRes.data.name,
			document: documentTableRes.data.name,
			documentFields: documentFieldsRes.data.name,
		},
		error: undefined,
	};
};
