import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	FieldConfig,
	FieldTypes,
	FieldUIConfig,
	SharedFieldConfig,
} from "../../types.js";

export interface TabFieldConfig extends SharedFieldConfig {
	type: "tab";
	details: {
		label?: AdminCopyInput;
		description?: AdminCopyInput;
	};
	ui?: Pick<FieldUIConfig, "condition">;
	fields: Exclude<FieldConfig<FieldTypes>, TabFieldConfig>[];
}

export type TabFieldProps = Partial<
	Omit<TabFieldConfig, "key" | "type" | "fields">
>;

export type TabResValue = null;

export type TabCustomFieldMapItem = {
	props: TabFieldProps;
	config: TabFieldConfig;
	response: {
		value: TabResValue;
	};
};
