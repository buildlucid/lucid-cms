import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export type LinkResValue = {
	url: string | null;
	target: string | null;
	label: string | null;
} | null;

export interface LinkFieldConfig extends SharedFieldConfig {
	type: "link";
	details: {
		label?: AdminCopyInput;
		summary?: AdminCopyInput;
		placeholder?: AdminCopyInput;
	};
	localized?: boolean;
	default?: LinkResValue;
	index?: true;
	ui?: FieldUIConfig;
	validation?: {
		required?: boolean;
	};
}

export type LinkFieldProps = Partial<Omit<LinkFieldConfig, "type">>;

export type LinkRef = null;

export type LinkCustomFieldMapItem = {
	props: LinkFieldProps;
	config: LinkFieldConfig;
	response: {
		value: LinkResValue;
		ref: LinkRef;
	};
};
