import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	FieldConfig,
	FieldTypes,
	FieldUIConfig,
	SharedFieldConfig,
	StructuralFieldOutput,
	TabFieldConfig,
} from "../../types.js";

export interface CollapsibleFieldConfig extends SharedFieldConfig {
	type: "collapsible";
	/** Copy shown beside the input in the admin. */
	details: {
		/** Field name shown to editors. */
		label?: AdminCopyInput;
		/** Help text explaining what to enter. */
		description?: AdminCopyInput;
	};
	/** Use nested to group child values under this field key, or inline to place them alongside siblings. Defaults to nested. */
	output: StructuralFieldOutput;
	/** Whether the collapsible starts expanded. Defaults to false. */
	defaultOpen: boolean;
	/** Editor visibility and layout. */
	ui?: Pick<FieldUIConfig, "condition" | "width">;
	fields: Exclude<FieldConfig<FieldTypes>, TabFieldConfig>[];
}

export type CollapsibleFieldProps = Partial<
	Omit<CollapsibleFieldConfig, "key" | "type" | "fields">
>;

export type CollapsibleResValue = null;

export type CollapsibleCustomFieldMapItem = {
	props: CollapsibleFieldProps;
	config: CollapsibleFieldConfig;
	response: {
		value: CollapsibleResValue;
	};
};
