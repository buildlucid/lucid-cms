import type { Config } from "../../../types.js";
import type CollectionBuilder from "../../collection/builders/collection-builder/index.js";
import type { CollectionSchemaTable } from "../../collection/schema/types.js";
import type {
	DocumentVersionType,
	LucidBrickTableName,
} from "../../db/tables/index.js";
import type { BrickQueryResponse } from "../../repositories/document-bricks.js";
import type { RefResourceTargets } from "../types.js";

export type DocumentRefData = {
	rows: BrickQueryResponse[];
	fieldsSchemaByCollection: Record<
		string,
		CollectionSchemaTable<LucidBrickTableName>
	>;
};

export type DocumentRefVersionTypeResolver = (input: {
	table: string;
	collectionKey?: string;
}) => Exclude<DocumentVersionType, "revision">;

export type DocumentRefFormatContext = {
	collection: CollectionBuilder;
	collections: CollectionBuilder[];
	config: Config;
	host: string;
	bricksTableSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
	flattenDocumentFields?: boolean;
};

export type DocumentRefResolveInput = {
	targets: RefResourceTargets;
	versionType: Exclude<DocumentVersionType, "revision">;
	resolveVersionType?: DocumentRefVersionTypeResolver;
	allowedCollectionKeys?: string[];
	format: DocumentRefFormatContext;
};
