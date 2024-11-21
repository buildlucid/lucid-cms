import type z from "zod";
import type BrickBuilder from "../brick-builder/index.js";
import type { FieldTypes, CFConfig } from "../../custom-fields/types.js";
import type CollectionConfigSchema from "./schema.js";
import type { CollectionDocumentBuilderHooks } from "../../../types/hooks.js";
import type { CFColumn } from "../../custom-fields/types.js";
import type {
	FilterValue,
	FilterOperator,
} from "../../../types/query-params.js";

export interface FieldCollectionConfig {
	list?: true;
	filterable?: true;
}

export interface CollectionConfigSchemaType
	extends z.infer<typeof CollectionConfigSchema> {
	hooks?: CollectionDocumentBuilderHooks[];
	bricks?: {
		fixed?: Array<BrickBuilder>;
		builder?: Array<BrickBuilder>;
	};
}

export type CollectionData = {
	key: string;
	mode: CollectionConfigSchemaType["mode"];
	title: CollectionConfigSchemaType["title"];
	singular: CollectionConfigSchemaType["singular"];
	description: string | null;
	isLocked: boolean;
	useDrafts: boolean;
	useRevisions: boolean;
	config: {
		useTranslations: boolean;
		fields: {
			filter: FieldFilters;
			include: string[];
		};
	};
};

export type FieldFilters = Array<{
	key: string;
	type: FieldTypes;
}>;

export interface CollectionBrickConfig {
	key: BrickBuilder["key"];
	title: BrickBuilder["config"]["title"];
	description: BrickBuilder["config"]["description"];
	preview: BrickBuilder["config"]["preview"];
	fields: CFConfig<FieldTypes>[];
}

export interface DocumentFieldFilters {
	key: string;
	value: FilterValue;
	operator: FilterOperator;
	column: CFColumn<FieldTypes>;
}
