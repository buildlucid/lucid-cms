import constants from "../../../constants/constants.js";
import FieldBuilder from "../field-builder/index.js";
import type BrickBuilder from "../brick-builder/index.js";
import type { CFProps } from "../../custom-fields/types.js";
import type {
	CollectionConfigSchemaType,
	CollectionData,
	CollectionBrickConfig,
	CollectionTableNames,
	DisplayInListing,
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
import logger from "../../logger/index.js";

class CollectionBuilder extends FieldBuilder {
	key: string;
	config: CollectionConfigSchemaType;
	displayInListing: string[] = [];
	runtimeTableSchema?: CollectionSchema;
	dbTableSchema?: CollectionSchema;
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
			displayInListing?: DisplayInListing;
		},
	) {
		this.#fieldCollectionHelper(key, props?.displayInListing);
		super.addText(key, props);
		return this;
	}
	addNumber(
		key: string,
		props?: CFProps<"number"> & {
			displayInListing?: DisplayInListing;
		},
	) {
		this.#fieldCollectionHelper(key, props?.displayInListing);
		super.addNumber(key, props);
		return this;
	}
	addCheckbox(
		key: string,
		props?: CFProps<"checkbox"> & {
			displayInListing?: DisplayInListing;
		},
	) {
		this.#fieldCollectionHelper(key, props?.displayInListing);
		super.addCheckbox(key, props);
		return this;
	}
	addSelect(
		key: string,
		props?: CFProps<"select"> & {
			displayInListing?: DisplayInListing;
		},
	) {
		this.#fieldCollectionHelper(key, props?.displayInListing);
		super.addSelect(key, props);
		return this;
	}
	addTextarea(
		key: string,
		props?: CFProps<"textarea"> & {
			displayInListing?: DisplayInListing;
		},
	) {
		this.#fieldCollectionHelper(key, props?.displayInListing);
		super.addTextarea(key, props);
		return this;
	}
	addDateTime(
		key: string,
		props?: CFProps<"datetime"> & {
			displayInListing?: DisplayInListing;
		},
	) {
		this.#fieldCollectionHelper(key, props?.displayInListing);
		super.addDateTime(key, props);
		return this;
	}
	addUser(
		key: string,
		props?: CFProps<"user"> & {
			displayInListing?: DisplayInListing;
		},
	) {
		this.#fieldCollectionHelper(key, props?.displayInListing);
		super.addUser(key, props);
		return this;
	}
	addMedia(
		key: string,
		props?: CFProps<"media"> & {
			displayInListing?: DisplayInListing;
		},
	) {
		this.#fieldCollectionHelper(key, props?.displayInListing);
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
	#fieldCollectionHelper = (key: string, display?: DisplayInListing) => {
		if (display) this.displayInListing.push(key);
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
				displayInListing: this.displayInListing,
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

	getSchema(type: "runtime" | "db") {
		const schema =
			type === "runtime" ? this.runtimeTableSchema : this.dbTableSchema;
		if (!schema) {
			logger.error({
				scope: "collection-builder",
				message: `Collection ${this.key} has no ${type} table schema`,
			});
			return {
				key: this.key,
				tables: [],
			} satisfies CollectionSchema;
		}
		return schema;
	}
	bricksTableSchema(
		type: "runtime" | "db",
	): Array<CollectionSchemaTable<LucidBrickTableName>> {
		const schema = this.getSchema(type);

		return (schema.tables.filter(
			(table) => table.type !== "document" && table.type !== "versions",
		) ?? []) as Array<CollectionSchemaTable<LucidBrickTableName>>;
	}
	documentTableSchema(type: "runtime" | "db") {
		const schema = this.getSchema(type);
		return schema.tables.find((t) => t.type === "document") as
			| CollectionSchemaTable<LucidDocumentTableName>
			| undefined;
	}
	documentFieldsTableSchema(type: "runtime" | "db") {
		const schema = this.getSchema(type);
		return schema.tables.find((t) => t.type === "document-fields") as
			| CollectionSchemaTable<LucidBrickTableName>
			| undefined;
	}
	documentVersionTableSchema(type: "runtime" | "db") {
		const schema = this.getSchema(type);
		return schema.tables.find((t) => t.type === "versions") as
			| CollectionSchemaTable<LucidVersionTableName>
			| undefined;
	}
	tableNames(
		type: "runtime" | "db",
	): Awaited<ServiceResponse<CollectionTableNames>> {
		const versionTable = this.documentVersionTableSchema(type)?.name;
		const documentTable = this.documentTableSchema(type)?.name;
		const documentFields = this.documentFieldsTableSchema(type)?.name;

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
