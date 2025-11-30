import constants from "../../../constants/constants.js";
import FieldBuilder from "../field-builder/index.js";
import type BrickBuilder from "../brick-builder/index.js";
import type { CFProps } from "../../custom-fields/types.js";
import type {
	CollectionConfigSchemaType,
	CollectionData,
	CollectionBrickConfig,
	DisplayInListing,
} from "./types.js";

class CollectionBuilder extends FieldBuilder {
	key: string;
	config: CollectionConfigSchemaType;
	displayInListing: string[] = [];
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
				useRevisions:
					this.config.config?.useRevisions ??
					constants.collectionBuilder.useRevisions,
				useTranslations:
					this.config.config?.useTranslations ??
					constants.collectionBuilder.useTranslations,
				useAutoSave:
					this.config.config?.useAutoSave ??
					constants.collectionBuilder.useAutoSave,
				displayInListing: this.displayInListing,
				environments: this.config.config?.environments ?? [],
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
}

export default CollectionBuilder;
