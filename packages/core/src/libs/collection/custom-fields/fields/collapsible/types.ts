import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	CFConfig,
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
		summary?: AdminCopyInput;
	};
	/** Controls how child fields are shaped in client document responses. */
	output: StructuralFieldOutput;
	/** Whether the collapsible renders expanded by default in the admin. */
	defaultOpen: boolean;
	ui?: Pick<FieldUIConfig, "condition" | "width">;
	fields: Exclude<CFConfig<FieldTypes>, TabFieldConfig>[];
}

export type CollapsibleFieldProps = Partial<
	Omit<CollapsibleFieldConfig, "type" | "fields">
>;

export type CollapsibleResValue = null;
export type CollapsibleRef = null;

export type CollapsibleCustomFieldMapItem = {
	props: CollapsibleFieldProps;
	config: CollapsibleFieldConfig;
	response: {
		value: CollapsibleResValue;
		ref: CollapsibleRef;
	};
};
