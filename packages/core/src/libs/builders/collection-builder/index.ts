import constants from "../../../constants/constants.js";
import FieldBuilder from "../field-builder/index.js";
import type BrickBuilder from "../brick-builder/index.js";
import type { FieldTypes, CFProps } from "../../custom-fields/types.js";
import type { QueryParamFilters } from "../../../types/query-params.js";
import type {
	FieldCollectionConfig,
	CollectionConfigSchemaType,
	CollectionData,
	CollectionBrickConfig,
	FieldFilters,
	CollectionTableNames,
} from "./types.js";
import type {
	CollectionSchema,
	CollectionSchemaTable,
} from "../../../services/collection-migrator/schema/types.js";
import type {
	LucidBrickTableName,
	LucidDocumentTableName,
	LucidVersionTableName,
	ServiceResponse,
} from "../../../types.js";
import T from "../../../translations/index.js";

class CollectionBuilder extends FieldBuilder {
	key: string;
	config: CollectionConfigSchemaType;
	includeFieldKeys: string[] = [];
	filterableFieldKeys: FieldFilters = [];
	collectionTableSchema?: CollectionSchema;
	constructor(key: string, config: Omit<CollectionConfigSchemaType, "key">) {
		super();
		this.key = key;
		this.config = {
			key: this.key,
			...config,
		};

		if (this.config.bricks?.fixed) {
			this.config.bricks.fixed = this.#removeDuplicateBricks(
				config.bricks?.fixed,
			);
		}
		if (this.config.bricks?.builder) {
			this.config.bricks.builder = this.#removeDuplicateBricks(
				config.bricks?.builder,
			);
		}
	}
	// ------------------------------------
	// Builder Methods
	addText(
		key: string,
		props?: CFProps<"text"> & {
			collection?: FieldCollectionConfig;
		},
	) {
		this.#fieldCollectionHelper(key, props?.collection);
		super.addText(key, props);
		return this;
	}
	addNumber(
		key: string,
		props?: CFProps<"number"> & {
			collection?: FieldCollectionConfig;
		},
	) {
		this.#fieldCollectionHelper(key, props?.collection);
		super.addNumber(key, props);
		return this;
	}
	addCheckbox(
		key: string,
		props?: CFProps<"checkbox"> & {
			collection?: FieldCollectionConfig;
		},
	) {
		this.#fieldCollectionHelper(key, props?.collection);
		super.addCheckbox(key, props);
		return this;
	}
	addSelect(
		key: string,
		props?: CFProps<"select"> & {
			collection?: FieldCollectionConfig;
		},
	) {
		this.#fieldCollectionHelper(key, props?.collection);
		super.addSelect(key, props);
		return this;
	}
	addTextarea(
		key: string,
		props?: CFProps<"textarea"> & {
			collection?: FieldCollectionConfig;
		},
	) {
		this.#fieldCollectionHelper(key, props?.collection);
		super.addTextarea(key, props);
		return this;
	}
	addDateTime(
		key: string,
		props?: CFProps<"datetime"> & {
			collection?: FieldCollectionConfig;
		},
	) {
		this.#fieldCollectionHelper(key, props?.collection);
		super.addDateTime(key, props);
		return this;
	}
	addUser(
		key: string,
		props?: CFProps<"user"> & {
			collection?: FieldCollectionConfig;
		},
	) {
		this.#fieldCollectionHelper(key, props?.collection);
		super.addUser(key, props);
		return this;
	}
	addMedia(
		key: string,
		props?: CFProps<"media"> & {
			collection?: FieldCollectionConfig;
		},
	) {
		this.#fieldCollectionHelper(key, props?.collection);
		super.addMedia(key, props);
		return this;
	}
	// ------------------------------------
	// Private Methods
	#removeDuplicateBricks = (bricks?: Array<BrickBuilder>) => {
		if (!bricks) return undefined;

		return bricks.filter(
			(brick, index) => bricks.findIndex((b) => b.key === brick.key) === index,
		);
	};
	#fieldCollectionHelper = (key: string, config?: FieldCollectionConfig) => {
		if (config?.column) this.includeFieldKeys.push(key);
	};

	// ------------------------------------
	// Getters
	get getData(): CollectionData {
		return {
			key: this.key,
			mode: this.config.mode,
			details: {
				name: this.config.details.name,
				singularName: this.config.details.singularName,
				summary: this.config.details.summary ?? null,
			},
			config: {
				isLocked:
					this.config.config?.isLocked ?? constants.collectionBuilder.isLocked,
				useDrafts:
					this.config.config?.useDrafts ??
					constants.collectionBuilder.useDrafts,
				useRevisions:
					this.config.config?.useRevisions ??
					constants.collectionBuilder.useRevisions,
				useTranslations:
					this.config.config?.useTranslations ??
					constants.collectionBuilder.useTranslations,
				fields: {
					filter: this.filterableFieldKeys,
					include: this.includeFieldKeys,
				},
			},
		};
	}
	get fixedBricks(): CollectionBrickConfig[] {
		return (
			this.config.bricks?.fixed?.map((brick) => ({
				key: brick.key,
				details: brick.config.details,
				preview: brick.config.preview,
				fields: brick.fieldTree,
			})) ?? []
		);
	}
	get builderBricks(): CollectionBrickConfig[] {
		return (
			this.config.bricks?.builder?.map((brick) => ({
				key: brick.key,
				details: brick.config.details,
				preview: brick.config.preview,
				fields: brick.fieldTree,
			})) ?? []
		);
	}
	get brickInstances(): Array<BrickBuilder> {
		return (this.config.bricks?.builder || []).concat(
			this.config.bricks?.fixed || [],
		);
	}

	get bricksTableSchema(): Array<CollectionSchemaTable<LucidBrickTableName>> {
		return (this.collectionTableSchema?.tables.filter(
			(table) => table.type !== "document" && table.type !== "versions",
		) ?? []) as Array<CollectionSchemaTable<LucidBrickTableName>>;
	}

	get documentTableSchema() {
		return this.collectionTableSchema?.tables.find(
			(t) => t.type === "document",
		) as CollectionSchemaTable<LucidDocumentTableName> | undefined;
	}
	get documentFieldsTableSchema() {
		return this.collectionTableSchema?.tables.find(
			(t) => t.type === "document-fields",
		) as CollectionSchemaTable<LucidBrickTableName> | undefined;
	}
	get documentVersionTableSchema() {
		return this.collectionTableSchema?.tables.find(
			(t) => t.type === "versions",
		) as CollectionSchemaTable<LucidVersionTableName> | undefined;
	}

	get tableNames(): Awaited<ServiceResponse<CollectionTableNames>> {
		const versionTable = this.documentVersionTableSchema?.name;
		const documentTable = this.documentTableSchema?.name;
		const documentFields = this.documentFieldsTableSchema?.name;

		if (!versionTable || !documentTable || !documentFields) {
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
				version: versionTable,
				document: documentTable,
				documentFields: documentFields,
			},
			error: undefined,
		};
	}
}

export default CollectionBuilder;
