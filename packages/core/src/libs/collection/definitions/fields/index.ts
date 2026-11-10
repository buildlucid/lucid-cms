import LucidError from "../../../../utils/errors/lucid-error.js";
import deepMerge from "../../../../utils/helpers/deep-merge.js";
import cloneField from "../../custom-fields/clone-field.js";
import createFieldSnapshot from "../../custom-fields/create-field-snapshot.js";
import type CustomField from "../../custom-fields/custom-field.js";
import registeredFields from "../../custom-fields/registered-fields.js";
import { isStorageMode } from "../../custom-fields/storage/index.js";
import type {
	FieldConfig,
	FieldTypes,
	TabFieldConfig,
} from "../../custom-fields/types.js";
import normalizeFieldCopy from "../../custom-fields/utils/normalize-field-copy.js";
import createField from "./create-field.js";
import type {
	FieldSetMeta,
	FieldNode,
	FieldPlacement,
	FieldSnapshot,
} from "./types.js";

/**
 * - `full` includes every field: tabs at the root and structural fields with
 *   their children nested. Used for admin rendering.
 * - `persisted` only includes stored fields, nested by storage scope. Used for
 *   schema inference and value formatting.
 * - `content` includes stored fields plus sections/collapsibles with their
 *   children nested. Tabs are transparent. Used for content response shaping.
 */
type FieldTreeMode = "full" | "persisted" | "content";

/** The containers a field sits inside while its node tree is turned into fields. */
type FieldParents = {
	tab: string | null;
	repeater: string | null;
	structural: string | null;
};

type StructuralFieldConfig =
	| FieldConfig<"section">
	| FieldConfig<"collapsible">;

const isStructuralFieldType = (
	type: FieldTypes,
): type is "section" | "collapsible" => {
	return type === "section" || type === "collapsible";
};

type FieldSetState = {
	fields: Map<string, CustomField<FieldTypes>>;
	meta: FieldSetMeta;
};

const fieldState = Symbol.for("lucidcms.field-set.state");

/** Internal field instances used for persistence and validation. */
export const getFieldSetState = (builder: FieldSet) => builder[fieldState];

/**
 * Holds a collection's or brick's fields and where each one sits. Fields come from `field.*`
 * node trees, and keys must be unique across the whole set, including nested fields.
 */
class FieldSet {
	readonly [fieldState]: FieldSetState = {
		fields: new Map(),
		meta: { fieldKeys: [], repeaterDepth: {} },
	};
	private cachedFieldTree: FieldConfig<FieldTypes>[] | null = null;
	private cachedPersistedFieldTree: FieldConfig<FieldTypes>[] | null = null;
	private cachedContentFieldTree: FieldConfig<FieldTypes>[] | null = null;

	protected invalidateFieldTreeCache() {
		this.cachedFieldTree = null;
		this.cachedPersistedFieldTree = null;
		this.cachedContentFieldTree = null;
	}

	/** Creates the fields a node tree describes, in the order editors see them, each knowing its containers. */
	private createFields(
		nodes: readonly FieldNode[],
		parents: FieldParents,
	): CustomField<FieldTypes>[] {
		return nodes.flatMap((node) => {
			const field = createField(node);
			if (field.props) field.props = deepMerge({}, field.props);
			field.config = deepMerge({}, field.config);
			normalizeFieldCopy(field.config);

			if (node.type === "tab") {
				if (
					parents.tab !== null ||
					parents.repeater !== null ||
					parents.structural !== null
				) {
					throw new LucidError({
						message: `Tab "${node.key}" cannot go inside another field. Tabs only go at the top level.`,
					});
				}
				return [
					field,
					...this.createFields(node.options.fields, {
						...parents,
						tab: node.key,
					}),
				];
			}

			field.tabParent = parents.tab;
			field.treeParent = parents.repeater;
			field.structuralParent = parents.structural;

			switch (node.type) {
				case "repeater":
					return [
						field,
						...this.createFields(node.options.fields, {
							tab: parents.tab,
							repeater: node.key,
							structural: null,
						}),
					];
				case "section":
				case "collapsible":
					return [
						field,
						...this.createFields(node.options.fields, {
							...parents,
							structural: node.key,
						}),
					];
				default:
					return [field];
			}
		});
	}

	/** Resolves a placement to a position among the fields and the tab the new fields join. */
	private resolvePlacement(placement: FieldPlacement) {
		const fields = Array.from(this[fieldState].fields.values());

		if (placement.at !== undefined) {
			if (placement.tab === undefined) {
				return {
					index: placement.at === "start" ? 0 : fields.length,
					tab: null,
				};
			}

			const tabIndex = fields.findIndex(
				(field) => field.key === placement.tab && field.type === "tab",
			);
			if (tabIndex === -1) {
				throw new LucidError({
					message: `Tab "${placement.tab}" does not exist.`,
				});
			}
			if (placement.at === "start") {
				return { index: tabIndex + 1, tab: placement.tab };
			}

			return {
				index:
					fields.findLastIndex(
						(field, index) =>
							index === tabIndex || field.tabParent === placement.tab,
					) + 1,
				tab: placement.tab,
			};
		}

		const anchorKey = placement.before ?? placement.after;
		const anchorIndex = fields.findIndex((field) => field.key === anchorKey);
		const anchor = fields[anchorIndex];
		if (!anchor) {
			throw new LucidError({
				message: `Field "${anchorKey}" does not exist.`,
			});
		}
		if (anchor.treeParent !== null || anchor.structuralParent !== null) {
			throw new LucidError({
				message: `Fields cannot be placed beside "${anchorKey}". It must be top-level or directly in a tab.`,
			});
		}

		const tab = anchor.type === "tab" ? null : anchor.tabParent;
		if (placement.after === undefined) return { index: anchorIndex, tab };

		//* the fields inside the anchor follow it, so placing after it means after them too
		const next = fields.findIndex(
			(field, index) =>
				index > anchorIndex &&
				(anchor.type === "tab"
					? field.tabParent !== anchor.key
					: field.type === "tab" ||
						(field.treeParent === null && field.structuralParent === null)),
		);
		return { index: next === -1 ? fields.length : next, tab };
	}

	/** Returns a detached snapshot of fields and their placement. */
	get fields(): ReadonlyMap<string, FieldSnapshot> {
		return new Map(
			Array.from(this[fieldState].fields, ([key, field]) => [
				key,
				createFieldSnapshot(field),
			]),
		);
	}

	/** Copies this field set without sharing field instances or cached output. */
	clone(): FieldSet {
		return this.copyFieldsTo(new FieldSet());
	}

	protected copyFieldsTo<T extends FieldSet>(target: T): T {
		const source = this[fieldState];
		const state = target[fieldState];
		state.fields = new Map(
			Array.from(source.fields, ([key, field]) => [key, cloneField(field)]),
		);
		state.meta = deepMerge({}, source.meta);
		target.invalidateFieldTreeCache();
		return target;
	}

	/**
	 * Adds fields among the top-level fields, at the end unless a placement says otherwise.
	 * Plugins use it to add their fields to a collection someone else defined.
	 *
	 * @example
	 * ```ts
	 * collection.insertFields([field.text("slug")], { after: "title" });
	 * ```
	 */
	insertFields(
		nodes: readonly FieldNode[],
		placement: FieldPlacement = { at: "end" },
	) {
		const state = this[fieldState];
		const { index, tab } = this.resolvePlacement(placement);
		const created = this.createFields(nodes, {
			tab,
			repeater: null,
			structural: null,
		});

		const keys = new Set(state.fields.keys());
		for (const field of created) {
			if (keys.has(field.key)) {
				throw new LucidError({
					message: `Field "${field.key}" is already registered.`,
				});
			}
			keys.add(field.key);
		}

		const entries = Array.from(state.fields);
		entries.splice(
			index,
			0,
			...created.map((field): [string, CustomField<FieldTypes>] => [
				field.key,
				field,
			]),
		);
		state.fields = new Map(entries);
		state.meta.fieldKeys = entries.map(([key]) => key);
		for (const field of created) {
			if (field.type !== "repeater") continue;
			state.meta.repeaterDepth[field.key] =
				field.treeParent === null
					? 0
					: (state.meta.repeaterDepth[field.treeParent] ?? 0) + 1;
		}

		this.invalidateFieldTreeCache();
		return this;
	}

	// Private Methods
	private nestFields(mode: FieldTreeMode): FieldConfig<FieldTypes>[] {
		const nestStructural = mode !== "persisted";
		const fields = Array.from(this[fieldState].fields.values()).filter(
			(field) => {
				if (mode === "full") return true;
				if (
					isStorageMode(registeredFields[field.type].config.database, "ignore")
				) {
					return mode === "content" && isStructuralFieldType(field.type);
				}
				return true;
			},
		);

		const result: FieldConfig<FieldTypes>[] = [];
		const tabMap: Map<string, FieldConfig<"tab">> = new Map();
		const repeaterMap: Map<string, FieldConfig<"repeater">> = new Map();
		const structuralMap: Map<string, StructuralFieldConfig> = new Map();

		for (const field of fields) {
			const config = JSON.parse(JSON.stringify(field.config));

			if (field.type === "tab") {
				const tab = config as FieldConfig<"tab">;
				tabMap.set(field.key, tab);
				result.push(tab);
				continue;
			}

			// add repeaters/structural containers to their lookups
			if (field.type === "repeater")
				repeaterMap.set(field.key, config as FieldConfig<"repeater">);
			if (nestStructural && isStructuralFieldType(field.type))
				structuralMap.set(field.key, config as StructuralFieldConfig);

			if (nestStructural && field.structuralParent) {
				const structural = structuralMap.get(field.structuralParent);
				if (structural) {
					structural.fields.push(
						config as Exclude<FieldConfig<FieldTypes>, TabFieldConfig>,
					);
					continue;
				}
			}

			if (field.treeParent) {
				const repeater = repeaterMap.get(field.treeParent);
				if (repeater)
					repeater.fields.push(
						config as Exclude<FieldConfig<FieldTypes>, TabFieldConfig>,
					);
				continue;
			}

			if (mode === "full" && field.tabParent) {
				const tab = tabMap.get(field.tabParent);
				if (tab) {
					tab.fields.push(
						config as Exclude<FieldConfig<FieldTypes>, TabFieldConfig>,
					);
					continue;
				}
			}

			result.push(config);
		}

		return result;
	}
	// Getters
	/** Returns a detached field tree including tabs and child groups. */
	get fieldTree(): FieldConfig<FieldTypes>[] {
		if (!this.cachedFieldTree) {
			this.cachedFieldTree = this.nestFields("full");
		}

		return this.cachedFieldTree.map((field) => deepMerge({}, field));
	}
	/** Returns a detached tree of stored fields, excluding layout-only containers. */
	get persistedFieldTree(): FieldConfig<FieldTypes>[] {
		if (!this.cachedPersistedFieldTree) {
			this.cachedPersistedFieldTree = this.nestFields("persisted");
		}

		return this.cachedPersistedFieldTree.map((field) => deepMerge({}, field));
	}
	/** Returns a detached content tree with sections and collapsibles; tabs are omitted. */
	get contentFieldTree(): FieldConfig<FieldTypes>[] {
		if (!this.cachedContentFieldTree) {
			this.cachedContentFieldTree = this.nestFields("content");
		}

		return this.cachedContentFieldTree.map((field) => deepMerge({}, field));
	}
	/** Returns detached field configurations in registration order. */
	get flatFields(): FieldConfig<FieldTypes>[] {
		const config: FieldConfig<FieldTypes>[] = [];
		for (const [_, value] of this[fieldState].fields) {
			config.push(deepMerge({}, value.config));
		}
		return config;
	}
}

export default FieldSet;
