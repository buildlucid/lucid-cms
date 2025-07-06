import T from "../../../translations/index.js";
import Repository from "../../repositories/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import type {
	CollectionSchema,
	CollectionSchemaTable,
} from "../../../services/collection-migrator/schema/types.js";
import type {
	LucidBrickTableName,
	LucidDocumentTableName,
	LucidVersionTableName,
	ServiceResponse,
	CollectionTableNames,
} from "../../../types.js";
import { getSchema as getCachedSchema, setSchema } from "./cache.js";

export const getSchema = async (
	context: ServiceContext,
	collectionKey: string,
): ServiceResponse<CollectionSchema> => {
	const cachedSchema = getCachedSchema(collectionKey);
	if (cachedSchema)
		return {
			data: cachedSchema,
			error: undefined,
		};

	const Collections = Repository.get(
		"collections",
		context.db,
		context.config.db,
	);

	const result = await Collections.selectSingle({
		select: ["schema"],
		where: [{ key: "key", operator: "=", value: collectionKey }],
		validation: { enabled: true },
	});
	if (result.error) return result;

	return {
		data: result.data.schema,
		error: undefined,
	};
};

export const syncAllDbSchemas = async (
	context: ServiceContext,
	collectionKeys?: string[],
): ServiceResponse<undefined> => {
	const keys = collectionKeys ?? context.config.collections.map((c) => c.key);

	const Collections = Repository.get(
		"collections",
		context.db,
		context.config.db,
	);

	const collectionsRes = await Collections.selectMultiple({
		select: ["key", "schema"],
		where: [
			{
				key: "key",
				operator: "in",
				value: keys,
			},
			{
				key: "is_deleted",
				operator: "=",
				value: context.config.db.getDefault("boolean", "false"),
			},
		],
		validation: { enabled: true },
	});
	if (collectionsRes.error) return collectionsRes;

	for (const collection of collectionsRes.data) {
		if (collection.schema) {
			setSchema(collection.key, collection.schema, "db");
		}
	}

	return {
		data: undefined,
		error: undefined,
	};
};

export const getBricksTableSchema = async (
	context: ServiceContext,
	collectionKey: string,
): ServiceResponse<Array<CollectionSchemaTable<LucidBrickTableName>>> => {
	const schemaRes = await getSchema(context, collectionKey);
	if (schemaRes.error) return schemaRes;

	return {
		error: undefined,
		data: schemaRes.data.tables.filter(
			(table) => table.type !== "document" && table.type !== "versions",
		) as Array<CollectionSchemaTable<LucidBrickTableName>>,
	};
};

export const getDocumentTableSchema = async (
	context: ServiceContext,
	collectionKey: string,
): ServiceResponse<
	CollectionSchemaTable<LucidDocumentTableName> | undefined
> => {
	const schema = await getSchema(context, collectionKey);
	if (schema.error) return schema;

	return {
		error: undefined,
		data: schema.data.tables.find((t) => t.type === "document") as
			| CollectionSchemaTable<LucidDocumentTableName>
			| undefined,
	};
};

export const getDocumentFieldsTableSchema = async (
	context: ServiceContext,
	collectionKey: string,
): ServiceResponse<CollectionSchemaTable<LucidBrickTableName> | undefined> => {
	const schemaRes = await getSchema(context, collectionKey);
	if (schemaRes.error) return schemaRes;

	return {
		error: undefined,
		data: schemaRes.data.tables.find((t) => t.type === "document-fields") as
			| CollectionSchemaTable<LucidBrickTableName>
			| undefined,
	};
};

export const getDocumentVersionTableSchema = async (
	context: ServiceContext,
	collectionKey: string,
): ServiceResponse<
	CollectionSchemaTable<LucidVersionTableName> | undefined
> => {
	const schemaRes = await getSchema(context, collectionKey);
	if (schemaRes.error) return schemaRes;

	return {
		error: undefined,
		data: schemaRes.data.tables.find((t) => t.type === "versions") as
			| CollectionSchemaTable<LucidVersionTableName>
			| undefined,
	};
};

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
