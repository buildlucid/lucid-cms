import type z from "zod";
import type BrickBuilder from "../brick-builder/index.js";
import type { FieldTypes, CFConfig } from "../../custom-fields/types.js";
import type CollectionConfigSchema from "./schema.js";
import type { DocumentBuilderHooks } from "../../../types/hooks.js";
import type { LocaleValue } from "../../../types/shared.js";
import type {
	LucidBrickTableName,
	LucidDocumentTableName,
	LucidVersionTableName,
} from "../../../types.js";

// TODO: rework this slightly, have this flat on the field config and call it listable or something. This will only be used to determine if it shows in rows on the frontend, it no longer does anything server side
export interface FieldCollectionConfig {
	column?: boolean; //* internally its called "include", "column" is just the public facing name as it makes it clear how it impacts the CMS
}

export interface CollectionConfigSchemaType
	extends z.infer<typeof CollectionConfigSchema> {
	hooks?: DocumentBuilderHooks[];
	bricks?: {
		fixed?: Array<BrickBuilder>;
		builder?: Array<BrickBuilder>;
	};
}

export type CollectionData = {
	key: string;
	mode: CollectionConfigSchemaType["mode"];
	details: {
		name: LocaleValue;
		singularName: LocaleValue;
		summary: LocaleValue | null;
	};
	config: {
		isLocked: boolean;
		useDrafts: boolean;
		useRevisions: boolean;
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
	details: BrickBuilder["config"]["details"];
	preview: BrickBuilder["config"]["preview"];
	fields: CFConfig<FieldTypes>[];
}

export type CollectionTableNames = {
	document: LucidDocumentTableName;
	version: LucidVersionTableName;
	documentFields: LucidBrickTableName;
};
