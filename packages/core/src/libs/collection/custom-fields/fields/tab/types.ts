import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	FieldConfig,
	FieldTypes,
	FieldUIConfig,
	SharedFieldConfig,
} from "../../types.js";

export interface TabFieldConfig extends SharedFieldConfig {
	type: "tab";
	/** Copy shown beside the input in the admin. */
	details: {
		/** Field name shown to editors. */
		label?: AdminCopyInput;
		/** Help text explaining what to enter. */
		description?: AdminCopyInput;
	};
	/** Editor visibility and layout. */
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
