import type CustomField from "../../custom-fields/custom-field.js";
import CheckboxCustomField from "../../custom-fields/fields/checkbox/custom-field.js";
import CodeCustomField from "../../custom-fields/fields/code/custom-field.js";
import CollapsibleCustomField from "../../custom-fields/fields/collapsible/custom-field.js";
import ColorCustomField from "../../custom-fields/fields/color/custom-field.js";
import DateTimeCF from "../../custom-fields/fields/datetime/custom-field.js";
import DocumentCustomField from "../../custom-fields/fields/document/custom-field.js";
import JSONCF from "../../custom-fields/fields/json/custom-field.js";
import LinkCustomField from "../../custom-fields/fields/link/custom-field.js";
import MediaCustomField from "../../custom-fields/fields/media/custom-field.js";
import NumberCustomField from "../../custom-fields/fields/number/custom-field.js";
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
	CFConfig,
	CFProps,
	FieldTypes,
	TabFieldConfig,
} from "../../custom-fields/types.js";
import normalizeFieldCopy from "../../custom-fields/utils/normalize-field-copy.js";
import type { FieldBuilderMeta } from "./types.js";

/**
 * - `full` includes every field: tabs at the root and structural fields with
 *   their children nested. Used for admin rendering.
 * - `persisted` only includes stored fields, nested by storage scope. Used for
 *   schema inference and value formatting.
 * - `client` includes stored fields plus sections/collapsibles with their
 *   children nested. Tabs are transparent. Used for client response shaping.
 */
type FieldTreeMode = "full" | "persisted" | "client";

type ContainerStackEntry = {
	kind: "repeater" | "section" | "collapsible";
	key: string;
};

type StructuralFieldConfig = CFConfig<"section"> | CFConfig<"collapsible">;

const isStructuralFieldType = (
	type: FieldTypes,
): type is "section" | "collapsible" => {
	return type === "section" || type === "collapsible";
};

class FieldBuilder {
	fields: Map<string, CustomField<FieldTypes>> = new Map();
	repeaterStack: string[] = [];
	containerStack: ContainerStackEntry[] = [];
	meta: FieldBuilderMeta = {
		fieldKeys: [],
		repeaterDepth: {},
	};
	private cachedFieldTree: CFConfig<FieldTypes>[] | null = null;
	private cachedPersistedFieldTree: CFConfig<FieldTypes>[] | null = null;
	private cachedClientFieldTree: CFConfig<FieldTypes>[] | null = null;

	protected invalidateFieldTreeCache() {
		this.cachedFieldTree = null;
		this.cachedPersistedFieldTree = null;
		this.cachedClientFieldTree = null;
	}

	private registerField(key: string, field: CustomField<FieldTypes>) {
		normalizeFieldCopy(field.config);

		const container = this.containerStack[this.containerStack.length - 1];
		if (container && container.kind !== "repeater" && field.type !== "tab") {
			field.structuralParent = container.key;
		}

		this.fields.set(key, field);
		this.meta.fieldKeys.push(key);
		this.invalidateFieldTreeCache();
		return this;
	}

	// Custom Fields
	public addRepeater(key: string, props?: CFProps<"repeater">) {
		this.meta.repeaterDepth[key] = this.repeaterStack.length;
		this.registerField(key, new RepeaterCustomField(key, props));
		this.repeaterStack.push(key);
		this.containerStack.push({ kind: "repeater", key });
		return this;
	}
	public addSection(key: string, props?: CFProps<"section">) {
		this.registerField(key, new SectionCustomField(key, props));
		this.containerStack.push({ kind: "section", key });
		return this;
	}
	public addCollapsible(key: string, props?: CFProps<"collapsible">) {
		this.registerField(key, new CollapsibleCustomField(key, props));
		this.containerStack.push({ kind: "collapsible", key });
		return this;
	}
	public addTab(key: string, props?: CFProps<"tab">) {
		//* tabs restart the root grouping, so any dangling structural containers close
		this.containerStack = [];
		return this.registerField(key, new TabCustomField(key, props));
	}
	public addText(key: string, props?: CFProps<"text">) {
		return this.registerField(key, new TextCustomField(key, props));
	}
	public addRichText(key: string, props?: CFProps<"rich-text">) {
		return this.registerField(key, new RichTextCustomField(key, props));
	}
	public addMedia(key: string, props?: CFProps<"media">) {
		return this.registerField(key, new MediaCustomField(key, props));
	}
	public addDocument(key: string, props: CFProps<"document">) {
		return this.registerField(key, new DocumentCustomField(key, props));
	}
	public addNumber(key: string, props?: CFProps<"number">) {
		return this.registerField(key, new NumberCustomField(key, props));
	}
	public addCheckbox(key: string, props?: CFProps<"checkbox">) {
		return this.registerField(key, new CheckboxCustomField(key, props));
	}
	public addSelect(key: string, props?: CFProps<"select">) {
		return this.registerField(key, new SelectCustomField(key, props));
	}
	public addTextarea(key: string, props?: CFProps<"textarea">) {
		return this.registerField(key, new TextareaCustomField(key, props));
	}
	public addJSON(key: string, props?: CFProps<"json">) {
		return this.registerField(key, new JSONCF(key, props));
	}
	public addCode(key: string, props?: CFProps<"code">) {
		return this.registerField(key, new CodeCustomField(key, props));
	}
	public addColor(key: string, props?: CFProps<"color">) {
		return this.registerField(key, new ColorCustomField(key, props));
	}
	public addDateTime(key: string, props?: CFProps<"datetime">) {
		return this.registerField(key, new DateTimeCF(key, props));
	}
	public addLink(key: string, props?: CFProps<"link">) {
		return this.registerField(key, new LinkCustomField(key, props));
	}
	public addUser(key: string, props?: CFProps<"user">) {
		return this.registerField(key, new UserCustomField(key, props));
	}
	public endRepeater() {
		const key = this.repeaterStack.pop();
		if (!key) return this;

		//* close the repeater and any dangling structural containers inside it
		while (this.containerStack.length > 0) {
			const entry = this.containerStack.pop();
			if (entry?.kind === "repeater" && entry.key === key) break;
		}

		const fields = Array.from(this.fields.values());

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
	public endSection() {
		const top = this.containerStack[this.containerStack.length - 1];
		if (top?.kind === "section") this.containerStack.pop();
		return this;
	}
	public endCollapsible() {
		const top = this.containerStack[this.containerStack.length - 1];
		if (top?.kind === "collapsible") this.containerStack.pop();
		return this;
	}
	// Private Methods
	private nestFields(mode: FieldTreeMode): CFConfig<FieldTypes>[] {
		const nestStructural = mode !== "persisted";
		const fields = Array.from(this.fields.values()).filter((field) => {
			if (mode === "full") return true;
			if (
				isStorageMode(registeredFields[field.type].config.database, "ignore")
			) {
				return mode === "client" && isStructuralFieldType(field.type);
			}
			return true;
		});

		const result: CFConfig<FieldTypes>[] = [];
		let currentTab: CFConfig<"tab"> | null = null;
		const repeaterMap: Map<string, CFConfig<"repeater">> = new Map();
		const structuralMap: Map<string, StructuralFieldConfig> = new Map();

		for (const field of fields) {
			const config = JSON.parse(JSON.stringify(field.config));

			if (field.type === "tab") {
				if (currentTab) result.push(currentTab);
				currentTab = config as CFConfig<"tab">;
				continue;
			}

			// add repeaters/structural containers to their lookups
			if (field.type === "repeater")
				repeaterMap.set(field.key, config as CFConfig<"repeater">);
			if (nestStructural && isStructuralFieldType(field.type))
				structuralMap.set(field.key, config as StructuralFieldConfig);

			if (nestStructural && field.structuralParent) {
				const structural = structuralMap.get(field.structuralParent);
				if (structural) {
					structural.fields.push(
						config as Exclude<CFConfig<FieldTypes>, TabFieldConfig>,
					);
					continue;
				}
			}

			if (field.treeParent) {
				const repeater = repeaterMap.get(field.treeParent);
				if (repeater)
					repeater.fields.push(
						config as Exclude<CFConfig<FieldTypes>, TabFieldConfig>,
					);
				continue;
			}

			const targetPush = currentTab ? currentTab.fields : result;
			targetPush.push(config);
		}

		if (currentTab) result.push(currentTab);

		return result;
	}
	// Getters
	get fieldTree(): CFConfig<FieldTypes>[] {
		if (!this.cachedFieldTree) {
			this.cachedFieldTree = this.nestFields("full");
		}

		return this.cachedFieldTree;
	}
	get persistedFieldTree(): CFConfig<FieldTypes>[] {
		if (!this.cachedPersistedFieldTree) {
			this.cachedPersistedFieldTree = this.nestFields("persisted");
		}

		return this.cachedPersistedFieldTree;
	}
	get clientFieldTree(): CFConfig<FieldTypes>[] {
		if (!this.cachedClientFieldTree) {
			this.cachedClientFieldTree = this.nestFields("client");
		}

		return this.cachedClientFieldTree;
	}
	get flatFields(): CFConfig<FieldTypes>[] {
		const config: CFConfig<FieldTypes>[] = [];
		for (const [_, value] of this.fields) {
			config.push(value.config);
		}
		return config;
	}
}

export default FieldBuilder;
