import { copy, normalizeCopy } from "../../../i18n/index.js";
import FieldBuilder from "../field-builder/index.js";
import type { BrickConfig, BrickConfigProps } from "./types.js";

class BrickBuilder extends FieldBuilder {
	key: string;
	config: BrickConfig;
	constructor(key: string, config?: BrickConfigProps) {
		super();
		this.key = key;
		this.config = {
			key: this.key,
			details: {
				name:
					normalizeCopy(config?.details?.name) ||
					copy(`admin:bricks.${this.key}.name`, {
						defaultMessage: key,
					}),
				summary: normalizeCopy(config?.details?.summary),
			},
			preview: config?.preview || {},
			tenants: config?.tenants ?? [],
		};
	}
	// Builder methods
	public addFields(Builder: BrickBuilder | FieldBuilder) {
		const fields = Array.from(Builder.fields.values());
		for (const field of fields) {
			if (field.type !== "tab" && field.tabParent === null) {
				field.tabParent = this.activeTabKey;
			}
			this.fields.set(field.key, field);
			this.meta.fieldKeys.push(field.key);
		}
		this.activeTabKey = Builder.activeTabKey ?? this.activeTabKey;
		this.invalidateFieldTreeCache();
		return this;
	}
}

export default BrickBuilder;
