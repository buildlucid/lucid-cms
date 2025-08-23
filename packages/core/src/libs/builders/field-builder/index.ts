import type CustomField from "../../custom-fields/custom-field.js";
import CheckboxCustomField from "../../custom-fields/fields/checkbox.js";
import ColorCustomField from "../../custom-fields/fields/color.js";
import DateTimeCF from "../../custom-fields/fields/datetime.js";
import JSONCF from "../../custom-fields/fields/json.js";
import LinkCustomField from "../../custom-fields/fields/link.js";
import MediaCustomField from "../../custom-fields/fields/media.js";
import NumberCustomField from "../../custom-fields/fields/number.js";
import RepeaterCustomField from "../../custom-fields/fields/repeater.js";
import SelectCustomField from "../../custom-fields/fields/select.js";
import TextCustomField from "../../custom-fields/fields/text.js";
import TextareaCustomField from "../../custom-fields/fields/textarea.js";
import UserCustomField from "../../custom-fields/fields/user.js";
import WysiwygCustomField from "../../custom-fields/fields/wysiwyg.js";
import DocumentCustomField from "../../custom-fields/fields/document.js";
import type {
	FieldTypes,
	CFProps,
	CFConfig,
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
	// Custom Fields
	public addRepeater(key: string, props?: CFProps<"repeater">) {
		this.meta.repeaterDepth[key] = this.repeaterStack.length;
		this.fields.set(key, new RepeaterCustomField(key, props));
		this.repeaterStack.push(key);
		return this;
	}
	public addText(key: string, props?: CFProps<"text">) {
		this.fields.set(key, new TextCustomField(key, props));
		this.meta.fieldKeys.push(key);
		return this;
	}
	public addWysiwyg(key: string, props?: CFProps<"wysiwyg">) {
		this.fields.set(key, new WysiwygCustomField(key, props));
		this.meta.fieldKeys.push(key);
		return this;
	}
	public addMedia(key: string, props?: CFProps<"media">) {
		this.fields.set(key, new MediaCustomField(key, props));
		this.meta.fieldKeys.push(key);
		return this;
	}
	public addDocument(key: string, props: CFProps<"document">) {
		this.fields.set(key, new DocumentCustomField(key, props));
		this.meta.fieldKeys.push(key);
		return this;
	}
	public addNumber(key: string, props?: CFProps<"number">) {
		this.fields.set(key, new NumberCustomField(key, props));
		this.meta.fieldKeys.push(key);
		return this;
	}
	public addCheckbox(key: string, props?: CFProps<"checkbox">) {
		this.fields.set(key, new CheckboxCustomField(key, props));
		this.meta.fieldKeys.push(key);
		return this;
	}
	public addSelect(key: string, props?: CFProps<"select">) {
		this.fields.set(key, new SelectCustomField(key, props));
		this.meta.fieldKeys.push(key);
		return this;
	}
	public addTextarea(key: string, props?: CFProps<"textarea">) {
		this.fields.set(key, new TextareaCustomField(key, props));
		this.meta.fieldKeys.push(key);
		return this;
	}
	public addJSON(key: string, props?: CFProps<"json">) {
		this.fields.set(key, new JSONCF(key, props));
		this.meta.fieldKeys.push(key);
		return this;
	}
	public addColor(key: string, props?: CFProps<"color">) {
		this.fields.set(key, new ColorCustomField(key, props));
		this.meta.fieldKeys.push(key);
		return this;
	}
	public addDateTime(key: string, props?: CFProps<"datetime">) {
		this.fields.set(key, new DateTimeCF(key, props));
		this.meta.fieldKeys.push(key);
		return this;
	}
	public addLink(key: string, props?: CFProps<"link">) {
		this.fields.set(key, new LinkCustomField(key, props));
		this.meta.fieldKeys.push(key);
		return this;
	}
	public addUser(key: string, props?: CFProps<"user">) {
		this.fields.set(key, new UserCustomField(key, props));
		this.meta.fieldKeys.push(key);
		return this;
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

		for (const field of fieldsAfter) {
			if (field.type === "tab" || field.repeater) continue;
			field.repeater = key;
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
		return this.nestFields(false);
	}
	get fieldTreeNoTab(): Exclude<CFConfig<FieldTypes>, TabFieldConfig>[] {
		return this.nestFields(true) as Exclude<
			CFConfig<FieldTypes>,
			TabFieldConfig
		>[];
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
