import constants from "../../../../constants/constants.js";
import deepMerge from "../../../../utils/helpers/deep-merge.js";
import { normalizeCopy } from "../../../i18n/index.js";
import type { FieldOptions } from "../../custom-fields/types.js";
import type BrickBuilder from "../brick-builder/index.js";
import FieldBuilder from "../field-builder/index.js";
import type {
	CollectionBrickConfig,
	CollectionData,
	CollectionLabelFieldOptions,
	CollectionListFieldOptions,
	CollectionOptions,
	CollectionPreviewOptions,
} from "./types.js";

const collectionBrand = Symbol.for("lucidcms.collection-builder");

/** Recognizes collection builders across separately loaded copies of core. */
export const isCollectionBuilder = (
	value: unknown,
): value is CollectionBuilder =>
	typeof value === "object" &&
	value !== null &&
	collectionBrand in value &&
	value[collectionBrand] === true &&
	"key" in value &&
	typeof value.key === "string" &&
	"config" in value &&
	typeof value.config === "object" &&
	value.config !== null &&
	"clone" in value &&
	typeof value.clone === "function" &&
	"addFields" in value &&
	typeof value.addFields === "function" &&
	"moveFields" in value &&
	typeof value.moveFields === "function";

/**
 * Defines a document collection and its fields. Register it in config or default export it from the collections directory.
 *
 * @example
 * ```ts
 * const pages = new CollectionBuilder("pages", {
 *   mode: "multiple",
 *   details: { labels: { singular: "Page", plural: "Pages" } },
 *   revisions: true,
 * })
 *   .addText("title", {
 *     useAsLabel: true,
 *     validation: { required: true },
 *   })
 *   .addRepeater("links")
 *     .addLink("link")
 *   .endRepeater();
 * ```
 */
class CollectionBuilder<
	const TCollectionKey extends string = string,
> extends FieldBuilder {
	readonly [collectionBrand] = true;
	key: TCollectionKey;
	config: CollectionOptions<TCollectionKey> & { key: TCollectionKey };
	listing: string[] = [];
	labelFields: string[] = [];
	constructor(key: TCollectionKey, config: CollectionOptions<TCollectionKey>) {
		super();
		this.key = key;
		this.config = {
			...deepMerge({}, config),
			key: this.key,
		};

		if (this.config.bricks?.fixed) {
			this.config.bricks.fixed = this.#copyBricks(this.config.bricks?.fixed);
		}
		if (this.config.bricks?.builder) {
			this.config.bricks.builder = this.#copyBricks(
				this.config.bricks?.builder,
			);
		}
		if (this.config.bricks?.embedded) {
			this.config.bricks.embedded = this.#copyBricks(
				this.config.bricks?.embedded,
			);
		}
	}
	/** Returns a collection with independent config, bricks and fields. */
	override clone(): CollectionBuilder<TCollectionKey> {
		const cloned = this.copyFieldsTo(
			new CollectionBuilder(this.key, this.config),
		);
		cloned.listing = [...this.listing];
		cloned.labelFields = [...this.labelFields];
		return cloned;
	}
	// ------------------------------------
	// Builder Methods
	/** Adds a single-line text input. */
	addText(
		key: string,
		props?: FieldOptions<"text"> & CollectionLabelFieldOptions,
	) {
		super.addText(key, props);
		this.#fieldCollectionHelper(key, props);
		return this;
	}
	/** Adds a numeric input. */
	addNumber(
		key: string,
		props?: FieldOptions<"number"> & CollectionLabelFieldOptions,
	) {
		super.addNumber(key, props);
		this.#fieldCollectionHelper(key, props);
		return this;
	}
	/** Adds a slider with one or two numeric values. */
	addRange(
		key: string,
		props?: FieldOptions<"range"> & CollectionListFieldOptions,
	) {
		super.addRange(key, props);
		this.#fieldCollectionHelper(key, props);
		return this;
	}
	/** Adds a boolean checkbox. */
	addCheckbox(
		key: string,
		props?: FieldOptions<"checkbox"> & CollectionListFieldOptions,
	) {
		super.addCheckbox(key, props);
		this.#fieldCollectionHelper(key, props);
		return this;
	}
	/** Adds a dropdown storing the selected option value. */
	addSelect(
		key: string,
		props?: FieldOptions<"select"> & CollectionLabelFieldOptions,
	) {
		super.addSelect(key, props);
		this.#fieldCollectionHelper(key, props);
		return this;
	}
	/** Adds a multiline plain-text input. */
	addTextarea(
		key: string,
		props?: FieldOptions<"textarea"> & CollectionLabelFieldOptions,
	) {
		super.addTextarea(key, props);
		this.#fieldCollectionHelper(key, props);
		return this;
	}
	/** Adds a date input with optional time selection. */
	addDateTime(
		key: string,
		props?: FieldOptions<"datetime"> & CollectionLabelFieldOptions,
	) {
		super.addDateTime(key, props);
		this.#fieldCollectionHelper(key, props);
		return this;
	}
	/** Adds a user picker. Values are user ID arrays, even for single selection. */
	addUser(
		key: string,
		props?: FieldOptions<"user"> & CollectionListFieldOptions,
	) {
		super.addUser(key, props);
		this.#fieldCollectionHelper(key, props);
		return this;
	}
	/** Adds a media picker. Values are media ID arrays, even for single selection. */
	addMedia(
		key: string,
		props?: FieldOptions<"media"> & CollectionListFieldOptions,
	) {
		super.addMedia(key, props);
		this.#fieldCollectionHelper(key, props);
		return this;
	}
	/** Adds a document picker restricted to the configured collection keys. */
	addRelation(
		key: string,
		props: FieldOptions<"relation"> & CollectionListFieldOptions,
	) {
		super.addRelation(key, props);
		this.#fieldCollectionHelper(key, props);
		return this;
	}
	/** Adds a color picker. */
	addColor(
		key: string,
		props?: FieldOptions<"color"> & CollectionLabelFieldOptions,
	) {
		super.addColor(key, props);
		this.#fieldCollectionHelper(key, props);
		return this;
	}
	// ------------------------------------
	// Private Methods
	#copyBricks = (bricks?: Array<BrickBuilder>) => {
		if (!bricks) return undefined;
		return bricks
			.filter(
				(brick, index) =>
					bricks.findIndex((b) => b.key === brick.key) === index,
			)
			.map((brick) => brick.clone());
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
				label: null,
				order: null,
			};
		}

		return {
			key: group.key,
			label: normalizeCopy(group.label) ?? null,
			order: group.order ?? null,
		};
	};
	// ------------------------------------
	// Getters
	get resolvedPreviewConfig():
		| (CollectionPreviewOptions<TCollectionKey> & { enabled: boolean })
		| null {
		const preview = this.config.preview;
		if (preview === undefined || preview === false) return null;
		return preview === true
			? { enabled: true }
			: { ...deepMerge({}, preview), enabled: preview.enabled ?? true };
	}
	get getData(): CollectionData {
		const preview = this.resolvedPreviewConfig;
		const revisions =
			this.config.revisions === true
				? { enabled: true }
				: this.config.revisions;
		const publishing = this.config.publishing;
		const review = publishing?.review;
		const workflow = publishing?.workflow;
		const data: CollectionData = {
			key: this.key,
			mode: this.config.mode,
			group: this.#formatGroup(),
			details: {
				labels: {
					singular: normalizeCopy(this.config.details.labels.singular),
					plural: normalizeCopy(this.config.details.labels.plural),
				},
				description: normalizeCopy(this.config.details.description) ?? null,
			},
			locked: this.config.locked ?? constants.collectionBuilder.locked,
			localized:
				(this.config.localized ?? constants.collectionBuilder.localized) !==
				false,
			revisions: {
				enabled: revisions?.enabled ?? constants.collectionBuilder.revisions,
				retentionDays:
					revisions?.retentionDays ??
					constants.collectionBuilder.revisionRetentionDays,
			},
			autoSave: this.config.autoSave ?? constants.collectionBuilder.autoSave,
			orderable: this.config.orderable ?? constants.collectionBuilder.orderable,
			listing: [...this.listing],
			labelFields: [...this.labelFields],
			publishing: {
				scheduling:
					publishing?.scheduling ?? constants.collectionBuilder.scheduling,
				targets:
					publishing?.targets?.map((target) => ({
						...target,
						label: normalizeCopy(target.label),
						requires: [...(target.requires ?? [])],
						collectionVersions: { ...target.collectionVersions },
					})) ?? [],
				review: review
					? {
							requiredFor: [...(review.requiredFor ?? [])],
							allowSelfApproval:
								review.allowSelfApproval ??
								constants.collectionBuilder.publishing.allowSelfApproval,
							comments: {
								request:
									review.comments?.request ??
									constants.collectionBuilder.publishing.comments.request,
								decision:
									review.comments?.decision ??
									constants.collectionBuilder.publishing.comments.decision,
							},
						}
					: undefined,
				workflow: workflow
					? {
							initial: workflow.initial ?? workflow.stages[0]?.key ?? "",
							stages: workflow.stages.map((stage) => ({
								key: stage.key,
								label: normalizeCopy(stage.label),
								color:
									stage.color ??
									constants.collectionBuilder.publishing.workflow.color,
								publishTargets: [...(stage.publishTargets ?? [])],
							})),
						}
					: undefined,
			},
			routing: this.config.routing ? { ...this.config.routing } : null,
			preview: preview?.enabled
				? {
						breakpoints:
							preview.breakpoints?.map((breakpoint) => ({
								...breakpoint,
								label: normalizeCopy(breakpoint.label),
							})) ?? [],
					}
				: null,
		};
		return deepMerge({}, data);
	}
	get fixedBricks(): CollectionBrickConfig[] {
		return (
			this.config.bricks?.fixed?.map((brick) => ({
				key: brick.key,
				details: deepMerge({}, brick.config.details),
				thumbnail: brick.config.thumbnail,
				fields: brick.fieldTree,
			})) ?? []
		);
	}
	get builderBricks(): CollectionBrickConfig[] {
		return (
			this.config.bricks?.builder?.map((brick) => ({
				key: brick.key,
				details: deepMerge({}, brick.config.details),
				thumbnail: brick.config.thumbnail,
				fields: brick.fieldTree,
			})) ?? []
		);
	}
	get embeddedBricks(): CollectionBrickConfig[] {
		return (
			this.config.bricks?.embedded?.map((brick) => ({
				key: brick.key,
				details: deepMerge({}, brick.config.details),
				thumbnail: brick.config.thumbnail,
				fields: brick.fieldTree,
			})) ?? []
		);
	}
	get brickInstances(): Array<BrickBuilder> {
		return (this.config.bricks?.builder || [])
			.concat(this.config.bricks?.fixed || [])
			.concat(this.config.bricks?.embedded || []);
	}
}

export default CollectionBuilder;
