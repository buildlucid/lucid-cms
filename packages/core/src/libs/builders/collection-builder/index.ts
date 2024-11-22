import C from "../../../constants/constants.js";
import FieldBuilder from "../field-builder/index.js";
import type BrickBuilder from "../brick-builder/index.js";
import type { FieldTypes, CFProps } from "../../custom-fields/types.js";
import type { QueryParamFilters } from "../../../types/query-params.js";
import type {
	FieldCollectionConfig,
	CollectionConfigSchemaType,
	CollectionData,
	DocumentFieldFilters as DocumentFieldFiltersResponse,
	CollectionBrickConfig,
	FieldFilters,
} from "./types.js";

class CollectionBuilder extends FieldBuilder {
	key: string;
	config: CollectionConfigSchemaType;
	includeFieldKeys: string[] = [];
	filterableFieldKeys: FieldFilters = [];
	constructor(key: string, config: CollectionConfigSchemaType) {
		super();
		this.key = key;
		this.config = config;

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
		this.#fieldCollectionHelper(key, "text", props?.collection);
		super.addText(key, props);
		return this;
	}
	addNumber(
		key: string,
		props?: CFProps<"number"> & {
			collection?: FieldCollectionConfig;
		},
	) {
		this.#fieldCollectionHelper(key, "number", props?.collection);
		super.addNumber(key, props);
		return this;
	}
	addCheckbox(
		key: string,
		props?: CFProps<"checkbox"> & {
			collection?: FieldCollectionConfig;
		},
	) {
		this.#fieldCollectionHelper(key, "checkbox", props?.collection);
		super.addCheckbox(key, props);
		return this;
	}
	addSelect(
		key: string,
		props?: CFProps<"select"> & {
			collection?: FieldCollectionConfig;
		},
	) {
		this.#fieldCollectionHelper(key, "select", props?.collection);
		super.addSelect(key, props);
		return this;
	}
	addTextarea(
		key: string,
		props?: CFProps<"textarea"> & {
			collection?: FieldCollectionConfig;
		},
	) {
		this.#fieldCollectionHelper(key, "textarea", props?.collection);
		super.addTextarea(key, props);
		return this;
	}
	addDateTime(
		key: string,
		props?: CFProps<"datetime"> & {
			collection?: FieldCollectionConfig;
		},
	) {
		this.#fieldCollectionHelper(key, "datetime", props?.collection);
		super.addDateTime(key, props);
		return this;
	}
	addUser(
		key: string,
		props?: CFProps<"user"> & {
			collection?: FieldCollectionConfig;
		},
	) {
		this.#fieldCollectionHelper(key, "user", props?.collection);
		super.addUser(key, props);
		return this;
	}
	addMedia(
		key: string,
		props?: CFProps<"media"> & {
			collection?: FieldCollectionConfig;
		},
	) {
		this.#fieldCollectionHelper(key, "media", props?.collection);
		super.addMedia(key, props);
		return this;
	}
	// ------------------------------------
	// Public Methods
	documentFieldFilters(
		filters?: QueryParamFilters,
		allowAll?: boolean,
	): DocumentFieldFiltersResponse[] {
		if (!filters) return [];
		const fields = allowAll ? this.flatFields : this.filterableFieldKeys;

		return fields.reduce<DocumentFieldFiltersResponse[]>((acc, field) => {
			const filterValue = filters[field.key];
			if (filterValue === undefined) return acc;

			const fieldInstance = this.fields.get(field.key);
			if (!fieldInstance) return acc;

			acc.push({
				key: field.key,
				value: filterValue.value,
				operator: filterValue.operator ?? "=",
				column: fieldInstance.column,
			});

			return acc;
		}, []);
	}
	queryIncludeFields(all?: boolean) {
		if (all)
			return this.flatFields.filter((f) => f.type !== "tab").map((f) => f.key);

		const fieldKeys = Array.from(this.includeFieldKeys);
		for (const field of this.filterableFieldKeys) {
			if (fieldKeys.includes(field.key)) continue;
			fieldKeys.push(field.key);
		}
		return fieldKeys;
	}
	// ------------------------------------
	// Private Methods
	#removeDuplicateBricks = (bricks?: Array<BrickBuilder>) => {
		if (!bricks) return undefined;

		return bricks.filter(
			(brick, index) => bricks.findIndex((b) => b.key === brick.key) === index,
		);
	};
	#fieldCollectionHelper = (
		key: string,
		type: FieldTypes,
		config?: FieldCollectionConfig,
	) => {
		if (config?.column) this.includeFieldKeys.push(key);
		if (config?.filterable)
			this.filterableFieldKeys.push({
				key,
				type,
			});
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
				isLocked: this.config.config?.isLocked ?? C.collectionBuilder.isLocked,
				useDrafts:
					this.config.config?.useDrafts ?? C.collectionBuilder.useDrafts,
				useRevisions:
					this.config.config?.useRevisions ?? C.collectionBuilder.useRevisions,
				useTranslations:
					this.config.config?.useTranslations ??
					C.collectionBuilder.useTranslations,
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
				title: brick.config.title,
				description: brick.config.description,
				preview: brick.config.preview,
				fields: brick.fieldTree,
			})) ?? []
		);
	}
	get builderBricks(): CollectionBrickConfig[] {
		return (
			this.config.bricks?.builder?.map((brick) => ({
				key: brick.key,
				title: brick.config.title,
				description: brick.config.description,
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
}

export default CollectionBuilder;
