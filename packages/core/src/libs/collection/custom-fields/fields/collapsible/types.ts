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
	details: {
		label?: AdminCopyInput;
		description?: AdminCopyInput;
	};
	/** Controls how child fields are shaped in content API document responses. */
	output: StructuralFieldOutput;
	/** Whether the collapsible renders expanded by default in the admin. */
	defaultOpen: boolean;
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
