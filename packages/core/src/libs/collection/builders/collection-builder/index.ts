import constants from "../../../../constants/constants.js";
import { normalizeCopy } from "../../../i18n/index.js";
import type { CFProps } from "../../custom-fields/types.js";
import type BrickBuilder from "../brick-builder/index.js";
import FieldBuilder from "../field-builder/index.js";
import type {
	CollectionBrickConfig,
	CollectionConfigSchemaType,
	CollectionData,
	CollectionLabelFieldOptions,
	CollectionListFieldOptions,
} from "./types.js";

class CollectionBuilder extends FieldBuilder {
	key: string;
	config: CollectionConfigSchemaType;
	listing: string[] = [];
	labelFields: string[] = [];
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
	addText(key: string, props?: CFProps<"text"> & CollectionLabelFieldOptions) {
		this.#fieldCollectionHelper(key, props);
		super.addText(key, props);
		return this;
	}
	addNumber(
		key: string,
		props?: CFProps<"number"> & CollectionLabelFieldOptions,
	) {
		this.#fieldCollectionHelper(key, props);
		super.addNumber(key, props);
		return this;
	}
	addRange(key: string, props?: CFProps<"range"> & CollectionListFieldOptions) {
		this.#fieldCollectionHelper(key, props);
		super.addRange(key, props);
		return this;
	}
	addCheckbox(
		key: string,
		props?: CFProps<"checkbox"> & CollectionListFieldOptions,
	) {
		this.#fieldCollectionHelper(key, props);
		super.addCheckbox(key, props);
		return this;
	}
	addSelect(
		key: string,
		props?: CFProps<"select"> & CollectionLabelFieldOptions,
	) {
		this.#fieldCollectionHelper(key, props);
		super.addSelect(key, props);
		return this;
	}
	addTextarea(
		key: string,
		props?: CFProps<"textarea"> & CollectionLabelFieldOptions,
	) {
		this.#fieldCollectionHelper(key, props);
		super.addTextarea(key, props);
		return this;
	}
	addDateTime(
		key: string,
		props?: CFProps<"datetime"> & CollectionLabelFieldOptions,
	) {
		this.#fieldCollectionHelper(key, props);
		super.addDateTime(key, props);
		return this;
	}
	addUser(key: string, props?: CFProps<"user"> & CollectionListFieldOptions) {
		this.#fieldCollectionHelper(key, props);
		super.addUser(key, props);
		return this;
	}
	addMedia(key: string, props?: CFProps<"media"> & CollectionListFieldOptions) {
		this.#fieldCollectionHelper(key, props);
		super.addMedia(key, props);
		return this;
	}
	addRelation(
		key: string,
		props: CFProps<"relation"> & CollectionListFieldOptions,
	) {
		this.#fieldCollectionHelper(key, props);
		super.addRelation(key, props);
		return this;
	}
	addColor(
		key: string,
		props?: CFProps<"color"> & CollectionLabelFieldOptions,
	) {
		this.#fieldCollectionHelper(key, props);
		super.addColor(key, props);
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
	/** Tracks collection-level field display config while fields are registered. */
	#fieldCollectionHelper = (
		key: string,
		options?: CollectionLabelFieldOptions,
	) => {
		if (options?.showInList) this.listing.push(key);
		if (options?.useAsLabel) this.labelFields.push(key);
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
			locked: this.config.locked ?? constants.collectionBuilder.locked,
			revisions: this.config.revisions ?? constants.collectionBuilder.revisions,
			localized: this.config.localized ?? constants.collectionBuilder.localized,
			autoSave: this.config.autoSave ?? constants.collectionBuilder.autoSave,
			scheduling:
				this.config.scheduling ?? constants.collectionBuilder.scheduling,
			orderable: this.config.orderable ?? constants.collectionBuilder.orderable,
			...(this.config.review
				? {
						review: {
							requiredFor: this.config.review?.requiredFor ?? [],
							allowSelfApproval:
								this.config.review?.allowSelfApproval ??
								constants.collectionBuilder.publishing.allowSelfApproval,
							comments: {
								request:
									this.config.review?.comments?.request ??
									constants.collectionBuilder.publishing.comments.request,
								decision:
									this.config.review?.comments?.decision ??
									constants.collectionBuilder.publishing.comments.decision,
							},
						},
					}
				: {}),
			...(this.config.workflow
				? {
						workflow: {
							initial:
								this.config.workflow.initial ??
								this.config.workflow.stages[0]?.key ??
								"",
							stages: this.config.workflow.stages.map((stage) => ({
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
			labelFields: this.labelFields,
			environments:
				this.config.environments?.map((environment) => ({
					...environment,
					name: normalizeCopy(environment.name),
					requires: environment.requires ?? [],
					permissions: environment.permissions ?? {},
					collectionVersions: environment.collectionVersions ?? {},
				})) ?? [],
			revisionRetentionDays:
				this.config.revisionRetentionDays ??
				constants.collectionBuilder.revisionRetentionDays,
			preview: this.config.preview
				? {
						breakpoints:
							this.config.preview.breakpoints?.map((breakpoint) => ({
								...breakpoint,
								label: normalizeCopy(breakpoint.label),
							})) ?? [],
					}
				: null,
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
