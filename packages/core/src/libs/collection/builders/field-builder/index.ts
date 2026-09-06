import LucidError from "../../../../utils/errors/lucid-error.js";
import deepMerge from "../../../../utils/helpers/deep-merge.js";
import { translate } from "../../../i18n/index.js";
import cloneField from "../../custom-fields/clone-field.js";
import createFieldSnapshot from "../../custom-fields/create-field-snapshot.js";
import type CustomField from "../../custom-fields/custom-field.js";
import CheckboxCustomField from "../../custom-fields/fields/checkbox/custom-field.js";
import CodeCustomField from "../../custom-fields/fields/code/custom-field.js";
import CollapsibleCustomField from "../../custom-fields/fields/collapsible/custom-field.js";
import ColorCustomField from "../../custom-fields/fields/color/custom-field.js";
import DateTimeCF from "../../custom-fields/fields/datetime/custom-field.js";
import JSONCF from "../../custom-fields/fields/json/custom-field.js";
import LinkCustomField from "../../custom-fields/fields/link/custom-field.js";
import MediaCustomField from "../../custom-fields/fields/media/custom-field.js";
import NumberCustomField from "../../custom-fields/fields/number/custom-field.js";
import RangeCustomField from "../../custom-fields/fields/range/custom-field.js";
import RelationCustomField from "../../custom-fields/fields/relation/custom-field.js";
import RepeaterCustomField from "../../custom-fields/fields/repeater/custom-field.js";
import RichTextCustomField from "../../custom-fields/fields/rich-text/custom-field.js";
import SectionCustomField from "../../custom-fields/fields/section/custom-field.js";
import SelectCustomField from "../../custom-fields/fields/select/custom-field.js";
import TabCustomField from "../../custom-fields/fields/tab/custom-field.js";
import TextCustomField from "../../custom-fields/fields/text/custom-field.js";
import TextareaCustomField from "../../custom-fields/fields/textarea/custom-field.js";
import UserCustomField from "../../custom-fields/fields/user/custom-field.js";
import registeredFields from "../../custom-fields/registered-fields.js";
import { isStorageMode } from "../../custom-fields/storage/index.js";
import type {
	FieldConfig,
	FieldOptions,
	FieldTypes,
	TabFieldConfig,
} from "../../custom-fields/types.js";
import normalizeFieldCopy from "../../custom-fields/utils/normalize-field-copy.js";
import type { FieldBuilderMeta, FieldSnapshot } from "./types.js";

/**
 * - `full` includes every field: tabs at the root and structural fields with
 *   their children nested. Used for admin rendering.
 * - `persisted` only includes stored fields, nested by storage scope. Used for
 *   schema inference and value formatting.
 * - `content` includes stored fields plus sections/collapsibles with their
 *   children nested. Tabs are transparent. Used for content response shaping.
 */
type FieldTreeMode = "full" | "persisted" | "content";

type ContainerStackEntry = {
	kind: "repeater" | "section" | "collapsible";
	key: string;
};

type StructuralFieldConfig =
	| FieldConfig<"section">
	| FieldConfig<"collapsible">;

const isStructuralFieldType = (
	type: FieldTypes,
): type is "section" | "collapsible" => {
	return type === "section" || type === "collapsible";
};

type FieldBuilderState = {
	fields: Map<string, CustomField<FieldTypes>>;
	repeaterStack: string[];
	containerStack: ContainerStackEntry[];
	meta: FieldBuilderMeta;
	activeTabKey: string | null;
};

const fieldState = Symbol.for("lucidcms.field-builder.state");

/** Internal field instances used for persistence and validation. */
export const getFieldBuilderState = (builder: FieldBuilder) =>
	builder[fieldState];

/**
 * Builds reusable fields with chainable methods. Keys must be unique across the builder, including nested groups.
 * Close each repeater with `endRepeater()` before adding fields outside it.
 * Use `addFields()` to copy a completed group into a collection or brick.
 */
class FieldBuilder {
	readonly [fieldState]: FieldBuilderState = {
		fields: new Map(),
		repeaterStack: [],
		containerStack: [],
		meta: { fieldKeys: [], repeaterDepth: {} },
		activeTabKey: null,
	};
	private cachedFieldTree: FieldConfig<FieldTypes>[] | null = null;
	private cachedPersistedFieldTree: FieldConfig<FieldTypes>[] | null = null;
	private cachedContentFieldTree: FieldConfig<FieldTypes>[] | null = null;

	protected invalidateFieldTreeCache() {
		this.cachedFieldTree = null;
		this.cachedPersistedFieldTree = null;
		this.cachedContentFieldTree = null;
	}

	private registerField(key: string, field: CustomField<FieldTypes>) {
		if (this[fieldState].fields.has(key)) {
			throw new LucidError({
				message: `Field "${key}" is already registered.`,
			});
		}
		if (field.props) field.props = deepMerge({}, field.props);
		field.config = deepMerge({}, field.config);
		normalizeFieldCopy(field.config);

		if (field.type !== "tab") {
			field.tabParent = this[fieldState].activeTabKey;
		}

		const container =
			this[fieldState].containerStack[
				this[fieldState].containerStack.length - 1
			];
		if (container && container.kind !== "repeater" && field.type !== "tab") {
			field.structuralParent = container.key;
		}

		this[fieldState].fields.set(key, field);
		this[fieldState].meta.fieldKeys.push(key);
		this.invalidateFieldTreeCache();
		return this;
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

	/** Copies this builder without sharing field instances or cached output. */
	clone(): FieldBuilder {
		return this.copyFieldsTo(new FieldBuilder());
	}

	protected copyFieldsTo<T extends FieldBuilder>(target: T): T {
		const source = this[fieldState];
		const state = target[fieldState];
		state.fields = new Map(
			Array.from(source.fields, ([key, field]) => [key, cloneField(field)]),
		);
		state.meta = deepMerge({}, source.meta);
		state.repeaterStack = [...source.repeaterStack];
		state.containerStack = source.containerStack.map((entry) => ({ ...entry }));
		state.activeTabKey = source.activeTabKey;
		target.invalidateFieldTreeCache();
		return target;
	}

	/** Adds independent copies of another builder's fields at the current position. */
	addFields(builder: FieldBuilder) {
		const source = builder[fieldState];
		const target = this[fieldState];
		if (source.repeaterStack.length || source.containerStack.length) {
			throw new LucidError({
				message:
					"Complete the source builder's repeaters and structural containers before adding its fields.",
			});
		}
		for (const field of source.fields.values()) {
			if (target.fields.has(field.key)) {
				throw new LucidError({
					message: `Field "${field.key}" is already registered.`,
				});
			}
			if (
				field.type === "tab" &&
				(target.repeaterStack.length || target.containerStack.length)
			) {
				throw new LucidError({
					message:
						"Cannot add fields containing tabs inside a repeater, section or collapsible.",
				});
			}
		}
		const repeater = target.repeaterStack.at(-1) ?? null;
		const container = target.containerStack.at(-1);
		const fields = Array.from(source.fields.values(), (original) => {
			const field = cloneField(original);
			if (field.type !== "tab") {
				field.tabParent ??= target.activeTabKey;
				if (field.treeParent === null) {
					field.treeParent = repeater;
					if (
						field.structuralParent === null &&
						container?.kind !== "repeater"
					) {
						field.structuralParent = container?.key ?? null;
					}
				}
			}
			return field;
		});
		for (const field of fields) {
			target.fields.set(field.key, field);
			target.meta.fieldKeys.push(field.key);
		}
		for (const [key, depth] of Object.entries(source.meta.repeaterDepth)) {
			target.meta.repeaterDepth[key] = depth + target.repeaterStack.length;
		}
		target.activeTabKey = source.activeTabKey ?? target.activeTabKey;
		this.invalidateFieldTreeCache();
		return this;
	}

	/** Moves independent leaf fields to the root or a tab. The index excludes the moved fields. */
	moveFields(
		keys: readonly string[],
		placement: { index: number; tab?: string | null },
	) {
		const state = this[fieldState];
		if (state.repeaterStack.length || state.containerStack.length) {
			throw new LucidError({
				message:
					"Complete all repeaters and structural containers before moving fields.",
			});
		}
		const keySet = new Set(keys);
		if (keySet.size !== keys.length) {
			throw new LucidError({
				message: "Each field can only appear once in a move.",
			});
		}
		const fields = state.fields;
		for (const key of keys) {
			const field = fields.get(key);
			if (!field)
				throw new LucidError({ message: `Field "${key}" does not exist.` });
			if (
				field.treeParent !== null ||
				field.structuralParent !== null ||
				field.type === "tab" ||
				field.type === "repeater" ||
				isStructuralFieldType(field.type)
			) {
				throw new LucidError({
					message: `Field "${key}" cannot be moved. Only independent leaf fields can move to the root or a tab.`,
				});
			}
		}
		const tab = placement.tab ?? null;
		if (tab !== null && fields.get(tab)?.type !== "tab")
			throw new LucidError({ message: `Tab "${tab}" does not exist.` });
		const moved = Array.from(fields).filter(([key]) => keySet.has(key));
		const remaining = Array.from(fields).filter(([key]) => !keySet.has(key));
		if (
			!Number.isInteger(placement.index) ||
			placement.index < 0 ||
			placement.index > remaining.length
		)
			throw new LucidError({
				message: "Field placement index is outside the builder.",
			});
		if (
			tab !== null &&
			placement.index <= remaining.findIndex(([key]) => key === tab)
		) {
			throw new LucidError({
				message: `Fields must be placed after their target tab "${tab}".`,
			});
		}
		for (const [, field] of moved) {
			field.tabParent = tab;
		}
		remaining.splice(placement.index, 0, ...moved);
		this[fieldState].fields = new Map(remaining);
		this[fieldState].meta.fieldKeys = remaining.map(([key]) => key);
		this.invalidateFieldTreeCache();
		return this;
	}

	// Custom Fields
	/** Starts a repeatable group. Subsequent fields belong to it until `endRepeater()`. */
	public addRepeater(key: string, props?: FieldOptions<"repeater">) {
		this.registerField(key, new RepeaterCustomField(key, props));
		this[fieldState].meta.repeaterDepth[key] =
			this[fieldState].repeaterStack.length;
		this[fieldState].repeaterStack.push(key);
		this[fieldState].containerStack.push({ kind: "repeater", key });
		return this;
	}
	/** Starts a section of child fields. Close it with `endSection()`. */
	public addSection(key: string, props?: FieldOptions<"section">) {
		this.registerField(key, new SectionCustomField(key, props));
		this[fieldState].containerStack.push({ kind: "section", key });
		return this;
	}
	/** Starts a collapsible group of child fields. Close it with `endCollapsible()`. */
	public addCollapsible(key: string, props?: FieldOptions<"collapsible">) {
		this.registerField(key, new CollapsibleCustomField(key, props));
		this[fieldState].containerStack.push({ kind: "collapsible", key });
		return this;
	}
	/** Starts a root-level tab for subsequent fields. Finish repeaters before starting a tab. */
	public addTab(key: string, props?: FieldOptions<"tab">) {
		this.registerField(key, new TabCustomField(key, props));
		//* tabs restart the root grouping, so any dangling structural containers close
		this[fieldState].containerStack = [];
		this[fieldState].activeTabKey = key;
		return this;
	}
	/** Adds subsequent fields to an existing tab. An unknown key leaves the current tab unchanged. */
	public addToTab(key: string) {
		const field = this[fieldState].fields.get(key);
		if (!field) return this;

		if (field.type !== "tab") {
			throw new LucidError({
				message: translate("server:core.fields.tab.target.invalid", {
					data: {
						key,
						type: field.type,
					},
				}),
			});
		}

		this[fieldState].containerStack = [];
		this[fieldState].activeTabKey = key;
		return this;
	}
	/** Adds a single-line text input. */
	public addText(key: string, props?: FieldOptions<"text">) {
		return this.registerField(key, new TextCustomField(key, props));
	}
	/** Adds a rich-text editor storing a structured JSON document. */
	public addRichText(key: string, props?: FieldOptions<"rich-text">) {
		return this.registerField(key, new RichTextCustomField(key, props));
	}
	/** Adds a media picker. Values are media ID arrays, even for single selection. */
	public addMedia(key: string, props?: FieldOptions<"media">) {
		return this.registerField(key, new MediaCustomField(key, props));
	}
	/** Adds a document picker restricted to the configured collection keys. */
	public addRelation(key: string, props: FieldOptions<"relation">) {
		return this.registerField(key, new RelationCustomField(key, props));
	}
	/** Adds a numeric input. */
	public addNumber(key: string, props?: FieldOptions<"number">) {
		return this.registerField(key, new NumberCustomField(key, props));
	}
	/** Adds a slider with one or two numeric values. */
	public addRange(key: string, props?: FieldOptions<"range">) {
		return this.registerField(key, new RangeCustomField(key, props));
	}
	/** Adds a boolean checkbox. */
	public addCheckbox(key: string, props?: FieldOptions<"checkbox">) {
		return this.registerField(key, new CheckboxCustomField(key, props));
	}
	/** Adds a dropdown storing the selected option value. */
	public addSelect(key: string, props?: FieldOptions<"select">) {
		return this.registerField(key, new SelectCustomField(key, props));
	}
	/** Adds a multiline plain-text input. */
	public addTextarea(key: string, props?: FieldOptions<"textarea">) {
		return this.registerField(key, new TextareaCustomField(key, props));
	}
	/** Adds an editor for a JSON object or array. */
	public addJSON(key: string, props?: FieldOptions<"json">) {
		return this.registerField(key, new JSONCF(key, props));
	}
	/** Adds a code editor storing its language and source text. */
	public addCode(key: string, props?: FieldOptions<"code">) {
		return this.registerField(key, new CodeCustomField(key, props));
	}
	/** Adds a color picker. */
	public addColor(key: string, props?: FieldOptions<"color">) {
		return this.registerField(key, new ColorCustomField(key, props));
	}
	/** Adds a date input with optional time selection. */
	public addDateTime(key: string, props?: FieldOptions<"datetime">) {
		return this.registerField(key, new DateTimeCF(key, props));
	}
	/** Adds a link with a URL, target and label. */
	public addLink(key: string, props?: FieldOptions<"link">) {
		return this.registerField(key, new LinkCustomField(key, props));
	}
	/** Adds a user picker. Values are user ID arrays, even for single selection. */
	public addUser(key: string, props?: FieldOptions<"user">) {
		return this.registerField(key, new UserCustomField(key, props));
	}
	/** Closes the current repeater and any sections or collapsibles still open inside it. */
	public endRepeater() {
		const key = this[fieldState].repeaterStack.pop();
		if (!key) return this;

		//* close the repeater and any dangling structural containers inside it
		while (this[fieldState].containerStack.length > 0) {
			const entry = this[fieldState].containerStack.pop();
			if (entry?.kind === "repeater" && entry.key === key) break;
		}

		const fields = Array.from(this[fieldState].fields.values());

		// index of repeater that is being closed
		const selectedRepeaterIndex = fields.findIndex(
			(field) => field.type === "repeater" && field.key === key,
		);
		if (selectedRepeaterIndex === -1) return this; // Repeater not found

		// only fields after this repeater
		const fieldsAfter = fields.slice(selectedRepeaterIndex + 1);
		let hasUpdatedTreeParent = false;

		for (const field of fieldsAfter) {
			if (field.type === "tab" || field.treeParent) continue;
			field.treeParent = key;
			hasUpdatedTreeParent = true;
		}

		if (hasUpdatedTreeParent) {
			this.invalidateFieldTreeCache();
		}

		return this;
	}
	/** Closes the current section, if it is the innermost open container. */
	public endSection() {
		const top =
			this[fieldState].containerStack[
				this[fieldState].containerStack.length - 1
			];
		if (top?.kind === "section") this[fieldState].containerStack.pop();
		return this;
	}
	/** Closes the current collapsible, if it is the innermost open container. */
	public endCollapsible() {
		const top =
			this[fieldState].containerStack[
				this[fieldState].containerStack.length - 1
			];
		if (top?.kind === "collapsible") this[fieldState].containerStack.pop();
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

export default FieldBuilder;
