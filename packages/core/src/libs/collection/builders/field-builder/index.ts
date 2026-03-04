import type CustomField from "../../custom-fields/custom-field.js";
import CheckboxCustomField from "../../custom-fields/fields/checkbox/custom-field.js";
import ColorCustomField from "../../custom-fields/fields/color/custom-field.js";
import DateTimeCF from "../../custom-fields/fields/datetime/custom-field.js";
import DocumentCustomField from "../../custom-fields/fields/document/custom-field.js";
import JSONCF from "../../custom-fields/fields/json/custom-field.js";
import LinkCustomField from "../../custom-fields/fields/link/custom-field.js";
import MediaCustomField from "../../custom-fields/fields/media/custom-field.js";
import NumberCustomField from "../../custom-fields/fields/number/custom-field.js";
import RepeaterCustomField from "../../custom-fields/fields/repeater/custom-field.js";
import RichTextCustomField from "../../custom-fields/fields/rich-text/custom-field.js";
import SelectCustomField from "../../custom-fields/fields/select/custom-field.js";
import TextCustomField from "../../custom-fields/fields/text/custom-field.js";
import TextareaCustomField from "../../custom-fields/fields/textarea/custom-field.js";
import UserCustomField from "../../custom-fields/fields/user/custom-field.js";
import type {
	CFConfig,
	CFProps,
	FieldTypes,
	TabFieldConfig,
} from "../../custom-fields/types.js";
import type { FieldBuilderMeta } from "./types.js";

class FieldBuilder {
	fields: Map<string, CustomField<FieldTypes>> = new Map();
	repeaterStack: string[] = [];
	meta: FieldBuilderMeta = {
		fieldKeys: [],
		repeaterDepth: {},
	};
	private cachedFieldTree: CFConfig<FieldTypes>[] | null = null;
	private cachedFieldTreeNoTab:
		| Exclude<CFConfig<FieldTypes>, TabFieldConfig>[]
		| null = null;

	protected invalidateFieldTreeCache() {
		this.cachedFieldTree = null;
		this.cachedFieldTreeNoTab = null;
	}

	private registerField(key: string, field: CustomField<FieldTypes>) {
		this.fields.set(key, field);
		this.meta.fieldKeys.push(key);
		this.invalidateFieldTreeCache();
		return this;
	}

	// Custom Fields
	public addRepeater(key: string, props?: CFProps<"repeater">) {
		this.meta.repeaterDepth[key] = this.repeaterStack.length;
		this.repeaterStack.push(key);
		return this.registerField(key, new RepeaterCustomField(key, props));
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

		const fields = Array.from(this.fields.values());

		// index of repeater that is being closed
		const selectedRepeaterIndex = fields.findIndex(
			(field) => field.type === "repeater" && field.key === key,
		);
		if (selectedRepeaterIndex === -1) return this; // Repeater not found

		// only fields after this repeater
		const fieldsAfter = fields.slice(selectedRepeaterIndex + 1);
		let hasUpdatedFieldRepeater = false;

		for (const field of fieldsAfter) {
			if (field.type === "tab" || field.repeater) continue;
			field.repeater = key;
			hasUpdatedFieldRepeater = true;
		}

		if (hasUpdatedFieldRepeater) {
			this.invalidateFieldTreeCache();
		}

		return this;
	}
	// Private Methods
	private nestFields(excludeTabs: boolean): CFConfig<FieldTypes>[] {
		const fields = Array.from(this.fields.values()).filter((field) => {
			if (excludeTabs) {
				return field.type !== "tab";
			}
			return true;
		});

		const result: CFConfig<FieldTypes>[] = [];
		let currentTab: CFConfig<"tab"> | null = null;
		const repeaterStack: Map<string, CFConfig<"repeater">> = new Map();

		for (const field of fields) {
			const config = JSON.parse(JSON.stringify(field.config));

			if (field.type === "tab") {
				if (currentTab) result.push(currentTab);
				currentTab = config as CFConfig<"tab">;
				continue;
			}

			// add repeater to the stack
			if (field.type === "repeater")
				repeaterStack.set(field.key, config as CFConfig<"repeater">);

			const targetPush = currentTab ? currentTab.fields : result;

			if (field.repeater) {
				const repeater = repeaterStack.get(field.repeater);
				if (repeater)
					repeater.fields.push(
						config as Exclude<CFConfig<FieldTypes>, TabFieldConfig>,
					);
			} else {
				targetPush.push(config);
			}
		}

		if (currentTab) result.push(currentTab);

		return result;
	}
	// Getters
	get fieldTree(): CFConfig<FieldTypes>[] {
		if (!this.cachedFieldTree) {
			this.cachedFieldTree = this.nestFields(false);
		}

		return this.cachedFieldTree;
	}
	get fieldTreeNoTab(): Exclude<CFConfig<FieldTypes>, TabFieldConfig>[] {
		if (!this.cachedFieldTreeNoTab) {
			this.cachedFieldTreeNoTab = this.nestFields(true) as Exclude<
				CFConfig<FieldTypes>,
				TabFieldConfig
			>[];
		}

		return this.cachedFieldTreeNoTab;
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
