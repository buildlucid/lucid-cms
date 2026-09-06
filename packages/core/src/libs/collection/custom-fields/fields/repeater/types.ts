import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	FieldConfig,
	FieldTypes,
	FieldUIConfig,
	SharedFieldConfig,
	TabFieldConfig,
} from "../../types.js";

export interface RepeaterFieldConfig extends SharedFieldConfig {
	type: "repeater";
	fields: Exclude<FieldConfig<FieldTypes>, TabFieldConfig>[];
	details: {
		label?: AdminCopyInput;
		description?: AdminCopyInput;
	};
	ui?: Pick<FieldUIConfig, "disabled" | "condition" | "width">;
	validation?: {
		maxGroups?: number;
		minGroups?: number;
	};
}

export type RepeaterFieldProps = Partial<
	Omit<RepeaterFieldConfig, "key" | "type" | "fields">
>;

export type RepeaterResValue = null;

export type RepeaterCustomFieldMapItem = {
	props: RepeaterFieldProps;
	config: RepeaterFieldConfig;
	response: {
		value: RepeaterResValue;
	};
};
