import T from "../../../../translations/index.js";
import type {
	CollectionTableNames,
	LucidBrickTableName,
	LucidDocumentTableName,
	LucidVersionTableName,
	ServiceResponse,
} from "../../../../types.js";
import type { ServiceContext } from "../../../../utils/services/types.js";
import type { CollectionSchemaTable } from "../types.js";
import getRuntimeSchema from "./get-runtime-schema.js";

/**
 * Returns runtime schema tables for brick content on a collection.
 * - document-fields
 * - repeater
 * - brick
 */
export const getBricksTableSchema = async (
	context: ServiceContext,
	collectionKey: string,
): ServiceResponse<Array<CollectionSchemaTable<LucidBrickTableName>>> => {
	const schemaRes = await getRuntimeSchema(context, { collectionKey });
	if (schemaRes.error) return schemaRes;

	return {
		error: undefined,
		data: schemaRes.data.tables.filter(
			(table) => table.type !== "document" && table.type !== "versions",
		) as Array<CollectionSchemaTable<LucidBrickTableName>>,
	};
};

/**
 * Returns runtime schema for the document table on a collection.
 * - document
 */
export const getDocumentTableSchema = async (
	context: ServiceContext,
	collectionKey: string,
): ServiceResponse<
	CollectionSchemaTable<LucidDocumentTableName> | undefined
> => {
	const schema = await getRuntimeSchema(context, { collectionKey });
	if (schema.error) return schema;

	return {
		error: undefined,
		data: schema.data.tables.find((t) => t.type === "document") as
			| CollectionSchemaTable<LucidDocumentTableName>
			| undefined,
	};
};

/**
 * Returns runtime schema for the top-level document-fields table.
 * - document-fields
 */
export const getDocumentFieldsTableSchema = async (
	context: ServiceContext,
	collectionKey: string,
): ServiceResponse<CollectionSchemaTable<LucidBrickTableName> | undefined> => {
	const schemaRes = await getRuntimeSchema(context, { collectionKey });
	if (schemaRes.error) return schemaRes;

	return {
		error: undefined,
		data: schemaRes.data.tables.find((t) => t.type === "document-fields") as
			| CollectionSchemaTable<LucidBrickTableName>
			| undefined,
	};
};

/**
 * Returns runtime schema for the document versions table.
 * - versions
 */
export const getDocumentVersionTableSchema = async (
	context: ServiceContext,
	collectionKey: string,
): ServiceResponse<
	CollectionSchemaTable<LucidVersionTableName> | undefined
> => {
	const schemaRes = await getRuntimeSchema(context, { collectionKey });
	if (schemaRes.error) return schemaRes;

	return {
		error: undefined,
		data: schemaRes.data.tables.find((t) => t.type === "versions") as
			| CollectionSchemaTable<LucidVersionTableName>
			| undefined,
	};
};

/**
 * Returns runtime table names for a collection.
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
