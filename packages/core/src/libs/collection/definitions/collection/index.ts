import constants from "../../../../constants/constants.js";
import deepMerge from "../../../../utils/helpers/deep-merge.js";
import { normalizeCopy } from "../../../i18n/index.js";
import type BrickDefinition from "../brick/index.js";
import FieldSet from "../fields/index.js";
import type { FieldNode, FieldPlacement } from "../fields/types.js";
import walkFieldNodes from "../fields/walk-field-nodes.js";
import type {
	CollectionBrickConfig,
	CollectionData,
	CollectionOptions,
	CollectionPreviewOptions,
} from "./types.js";

const collectionBrand = Symbol.for("lucidcms.collection-definition");

/** Recognizes collections across separately loaded copies of core. */
export const isCollectionDefinition = (
	value: unknown,
): value is CollectionDefinition =>
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
	"insertFields" in value &&
	typeof value.insertFields === "function";

/** A document collection and its fields. Create one with `defineCollection`. */
class CollectionDefinition<
	const TCollectionKey extends string = string,
> extends FieldSet {
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
	override clone(): CollectionDefinition<TCollectionKey> {
		const cloned = this.copyFieldsTo(
			new CollectionDefinition(this.key, this.config),
		);
		cloned.listing = [...this.listing];
		cloned.labelFields = [...this.labelFields];
		return cloned;
	}
	// ------------------------------------
	// Builder Methods
	/** Adds fields, tracking the ones shown in the document list or used as its label. */
	override insertFields(
		nodes: readonly FieldNode[],
		placement?: FieldPlacement,
	) {
		super.insertFields(nodes, placement);
		walkFieldNodes(nodes, (node) => {
			const options = node.options;
			if (!options) return;
			if ("showInList" in options && options.showInList) {
				this.listing.push(node.key);
			}
			if ("useAsLabel" in options && options.useAsLabel) {
				this.labelFields.push(node.key);
			}
		});
		return this;
	}
	// ------------------------------------
	// Private Methods
	#copyBricks = (bricks?: Array<BrickDefinition>) => {
		if (!bricks) return undefined;
		return bricks
			.filter(
				(brick, index) =>
					bricks.findIndex((b) => b.key === brick.key) === index,
			)
			.map((brick) => brick.clone());
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
	#resolveReviewEnvironments = (environments?: string[] | true): string[] =>
		environments === true
			? (this.config.publishing?.environments ?? []).map(
					(environment) => environment.key,
				)
			: [...(environments ?? [])];
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
		const transfer = this.config.transfer ?? true;
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
			transfer: {
				export:
					typeof transfer === "boolean" ? transfer : (transfer.export ?? true),
				import:
					typeof transfer === "boolean" ? transfer : (transfer.import ?? true),
			},
			listing: [...this.listing],
			labelFields: [...this.labelFields],
			publishing: {
				scheduling:
					publishing?.scheduling ?? constants.collectionBuilder.scheduling,
				environments:
					publishing?.environments?.map((environment) => ({
						...environment,
						label: normalizeCopy(environment.label),
						requires: [...(environment.requires ?? [])],
						collectionVersions: { ...environment.collectionVersions },
					})) ?? [],
				review: review
					? {
							publish: this.#resolveReviewEnvironments(review.publish),
							unpublish: this.#resolveReviewEnvironments(
								review.unpublish ?? review.publish,
							),
							create: review.create ?? false,
							delete: review.delete ?? false,
							selfApproval:
								review.selfApproval ??
								constants.collectionBuilder.publishing.selfApproval,
							approvals:
								review.approvals ??
								constants.collectionBuilder.publishing.approvals,
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
								targets: [...(stage.targets ?? [])],
								resetTo: stage.resetTo ?? null,
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
				permissions: brick.config.permissions,
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
				permissions: brick.config.permissions,
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
				permissions: brick.config.permissions,
				fields: brick.fieldTree,
			})) ?? []
		);
	}
	get brickInstances(): Array<BrickDefinition> {
		return (this.config.bricks?.builder || [])
			.concat(this.config.bricks?.fixed || [])
			.concat(this.config.bricks?.embedded || []);
	}
}

export default CollectionDefinition;
