import FieldBuilder from "../field-builder/index.js";
import TabCustomField from "../../custom-fields/fields/tab.js";
import type { CFProps } from "../../custom-fields/types.js";
import type { BrickConfigProps, BrickConfig } from "./types.js";

class BrickBuilder extends FieldBuilder {
	key: string;
	config: BrickConfig;
	constructor(key: string, config?: BrickConfigProps) {
		super();
		this.key = key;
		this.config = {
			key: this.key,
			details: {
				name: config?.details?.name || key,
				summary: config?.details?.summary,
			},
			preview: config?.preview || {},
		};
	}
	// Builder methods
	public addFields(Builder: BrickBuilder | FieldBuilder) {
		const fields = Array.from(Builder.fields.values());
		for (const field of fields) {
			this.fields.set(field.key, field);
			this.meta.fieldKeys.push(field.key);
		}
		return this;
	}
	public addTab(key: string, props?: CFProps<"tab">) {
		this.fields.set(key, new TabCustomField(key, props));
		this.meta.fieldKeys.push(key);
		return this;
	}
}

export default BrickBuilder;
