import constants from "../../../../constants/constants.js";
import { normalizeCopy } from "../../../i18n/index.js";
import type { CFProps } from "../../custom-fields/types.js";
import type BrickBuilder from "../brick-builder/index.js";
import FieldBuilder from "../field-builder/index.js";
import type {
	CollectionBrickConfig,
	CollectionConfigSchemaType,
	CollectionData,
	Listing,
} from "./types.js";

class CollectionBuilder extends FieldBuilder {
	key: string;
	config: CollectionConfigSchemaType;
	listing: string[] = [];
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
			listing?: Listing;
		},
	) {
		this.#fieldCollectionHelper(key, props?.listing);
		super.addText(key, props);
		return this;
	}
	addNumber(
		key: string,
		props?: CFProps<"number"> & {
			listing?: Listing;
		},
	) {
		this.#fieldCollectionHelper(key, props?.listing);
		super.addNumber(key, props);
		return this;
	}
	addCheckbox(
		key: string,
		props?: CFProps<"checkbox"> & {
			listing?: Listing;
		},
	) {
		this.#fieldCollectionHelper(key, props?.listing);
		super.addCheckbox(key, props);
		return this;
	}
	addSelect(
		key: string,
		props?: CFProps<"select"> & {
			listing?: Listing;
		},
	) {
		this.#fieldCollectionHelper(key, props?.listing);
		super.addSelect(key, props);
		return this;
	}
	addTextarea(
		key: string,
		props?: CFProps<"textarea"> & {
			listing?: Listing;
		},
	) {
		this.#fieldCollectionHelper(key, props?.listing);
		super.addTextarea(key, props);
		return this;
	}
	addDateTime(
		key: string,
		props?: CFProps<"datetime"> & {
			listing?: Listing;
		},
	) {
		this.#fieldCollectionHelper(key, props?.listing);
		super.addDateTime(key, props);
		return this;
	}
	addUser(
		key: string,
		props?: CFProps<"user"> & {
			listing?: Listing;
		},
	) {
		this.#fieldCollectionHelper(key, props?.listing);
		super.addUser(key, props);
		return this;
	}
	addMedia(
		key: string,
		props?: CFProps<"media"> & {
			listing?: Listing;
		},
	) {
		this.#fieldCollectionHelper(key, props?.listing);
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
	#fieldCollectionHelper = (key: string, listing?: Listing) => {
		if (listing) this.listing.push(key);
	};
	#formatGroup = (): CollectionData["group"] => {
		const group = this.config.group;
		if (group === undefined) return null;
		if (typeof group === "string") {
			return {
				key: group,
				name: null,
				order: null,
			};
		}

		return {
			key: group.key,
			name: normalizeCopy(group.name) ?? null,
			order: group.order ?? null,
		};
	};

	// ------------------------------------
	// Getters
	get getData(): CollectionData {
		return {
			key: this.key,
			mode: this.config.mode,
			group: this.#formatGroup(),
			details: {
				name: normalizeCopy(this.config.details.name),
				singularName: normalizeCopy(this.config.details.singularName),
				summary: normalizeCopy(this.config.details.summary) ?? null,
			},
			features: {
				locked:
					this.config.features?.locked ?? constants.collectionBuilder.locked,
				revisions:
					this.config.features?.revisions ??
					constants.collectionBuilder.revisions,
				localized:
					this.config.features?.localized ??
					constants.collectionBuilder.localized,
				autoSave:
					this.config.features?.autoSave ??
					constants.collectionBuilder.autoSave,
				scheduling:
					this.config.features?.scheduling ??
					constants.collectionBuilder.scheduling,
				...(this.config.features?.review
					? {
							review: {
								requiredFor: this.config.features.review?.requiredFor ?? [],
								allowSelfApproval:
									this.config.features.review?.allowSelfApproval ??
									constants.collectionBuilder.publishing.allowSelfApproval,
								comments: {
									request:
										this.config.features.review?.comments?.request ??
										constants.collectionBuilder.publishing.comments.request,
									decision:
										this.config.features.review?.comments?.decision ??
										constants.collectionBuilder.publishing.comments.decision,
								},
							},
						}
					: {}),
				...(this.config.features?.workflow
					? {
							workflow: {
								initial:
									this.config.features.workflow.initial ??
									this.config.features.workflow.stages[0]?.key ??
									"",
								stages: this.config.features.workflow.stages.map((stage) => ({
									key: stage.key,
									name: normalizeCopy(stage.name),
									color:
										stage.color ??
										constants.collectionBuilder.publishing.workflow.color,
									publishTargets: stage.publishTargets ?? [],
									permissions: stage.permissions ?? {},
								})),
							},
						}
					: {}),
				listing: this.listing,
				environments:
					this.config.features?.environments?.map((environment) => ({
						...environment,
						name: normalizeCopy(environment.name),
						requires: environment.requires ?? [],
						permissions: environment.permissions ?? {},
						relations: environment.relations ?? {},
					})) ?? [],
				revisionRetentionDays:
					this.config.features?.revisionRetentionDays ??
					constants.collectionBuilder.revisionRetentionDays,
			},
			tenants: this.config.tenants ?? [],
			permissions: this.config.permissions ?? {},
		};
	}
	get fixedBricks(): CollectionBrickConfig[] {
		return (
			this.config.bricks?.fixed?.map((brick) => ({
				key: brick.key,
				details: brick.config.details,
				preview: brick.config.preview,
				tenants: brick.config.tenants,
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
				tenants: brick.config.tenants,
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
