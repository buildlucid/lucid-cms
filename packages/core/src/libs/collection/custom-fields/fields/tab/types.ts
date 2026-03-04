import type { LocaleValue } from "../../../../../types/shared.js";
import type { CFConfig, FieldTypes, SharedFieldConfig } from "../../types.js";

export interface TabFieldConfig extends SharedFieldConfig {
	type: "tab";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
	};
	fields: Exclude<CFConfig<FieldTypes>, TabFieldConfig>[];
}

export type TabFieldProps = Partial<Omit<TabFieldConfig, "type" | "fields">>;

export type TabResValue = null;
export type TabRef = null;

export type TabCustomFieldMapItem = {
	props: TabFieldProps;
	config: TabFieldConfig;
	response: {
		value: TabResValue;
		ref: TabRef;
	};
};
