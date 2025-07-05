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
	type: "runtime" | "db",
): ServiceResponse<CollectionSchema> => {
	const cachedSchema = getCachedSchema(collectionKey, type);
	if (cachedSchema)
		return {
			data: cachedSchema,
			error: undefined,
		};

	let schema: CollectionSchema | undefined;

	if (type === "runtime") {
		const collection = context.config.collections.find(
			(c) => c.key === collectionKey,
		);
		schema = collection?.runtimeTableSchema;

		if (schema) setSchema(collectionKey, schema, type);
	} else {
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

		schema = result.data.schema;
	}

	return {
		data: schema || {
			key: collectionKey,
			tables: [],
		},
		error: undefined,
	};
};

export const getBricksTableSchema = async (
	context: ServiceContext,
	collectionKey: string,
	type: "runtime" | "db",
): ServiceResponse<Array<CollectionSchemaTable<LucidBrickTableName>>> => {
	const schemaRes = await getSchema(context, collectionKey, type);
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
	type: "runtime" | "db",
): ServiceResponse<
	CollectionSchemaTable<LucidDocumentTableName> | undefined
> => {
	const schema = await getSchema(context, collectionKey, type);
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
	type: "runtime" | "db",
): ServiceResponse<CollectionSchemaTable<LucidBrickTableName> | undefined> => {
	const schemaRes = await getSchema(context, collectionKey, type);
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
	type: "runtime" | "db",
): ServiceResponse<
	CollectionSchemaTable<LucidVersionTableName> | undefined
> => {
	const schemaRes = await getSchema(context, collectionKey, type);
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
	type: "runtime" | "db",
): ServiceResponse<CollectionTableNames> => {
	const [versionTableRes, documentTableRes, documentFieldsRes] =
		await Promise.all([
			getDocumentVersionTableSchema(context, collectionKey, type),
			getDocumentTableSchema(context, collectionKey, type),
			getDocumentFieldsTableSchema(context, collectionKey, type),
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
