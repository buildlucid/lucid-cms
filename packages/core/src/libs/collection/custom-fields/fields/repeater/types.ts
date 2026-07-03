import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	CFConfig,
	FieldTypes,
	FieldUIConfig,
	SharedFieldConfig,
	TabFieldConfig,
} from "../../types.js";

export interface RepeaterFieldConfig extends SharedFieldConfig {
	type: "repeater";
	fields: Exclude<CFConfig<FieldTypes>, TabFieldConfig>[];
	details: {
		label?: AdminCopyInput;
		summary?: AdminCopyInput;
	};
	ui?: Pick<FieldUIConfig, "disabled" | "condition" | "width">;
	validation?: {
		maxGroups?: number;
		minGroups?: number;
	};
}

export type RepeaterFieldProps = Partial<
	Omit<RepeaterFieldConfig, "type" | "fields">
>;

export type RepeaterResValue = null;
export type RepeaterRef = null;

export type RepeaterCustomFieldMapItem = {
	props: RepeaterFieldProps;
	config: RepeaterFieldConfig;
	response: {
		value: RepeaterResValue;
		ref: RepeaterRef;
	};
};
