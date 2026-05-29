import type { AdminTextDescriptor } from "../../../../i18n/types.js";
import type {
	CFConfig,
	FieldTypes,
	SharedFieldConfig,
	TabFieldConfig,
} from "../../types.js";

export interface RepeaterFieldConfig extends SharedFieldConfig {
	type: "repeater";
	fields: Exclude<CFConfig<FieldTypes>, TabFieldConfig>[];
	details: {
		label?: AdminTextDescriptor;
		summary?: AdminTextDescriptor;
	};
	config: {
		disabled?: boolean;
	};
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
