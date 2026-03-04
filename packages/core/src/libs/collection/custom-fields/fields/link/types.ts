import type { LocaleValue } from "../../../../../types/shared.js";
import type { SharedFieldConfig } from "../../types.js";

export type LinkResValue = {
	url: string | null;
	target: string | null;
	label: string | null;
} | null;

export interface LinkFieldConfig extends SharedFieldConfig {
	type: "link";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
		placeholder?: LocaleValue;
	};
	config: {
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
		default?: LinkResValue;
	};
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
