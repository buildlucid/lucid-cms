import type { LocaleValue } from "../../../../../types/shared.js";
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
		label?: LocaleValue;
		summary?: LocaleValue;
	};
	config: {
		isDisabled?: boolean;
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
