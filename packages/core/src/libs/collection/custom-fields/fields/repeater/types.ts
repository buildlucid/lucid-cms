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
	/** Copy shown beside the input in the admin. */
	details: {
		/** Field name shown to editors. */
		label?: AdminCopyInput;
		/** Help text explaining what to enter. */
		description?: AdminCopyInput;
	};
	/** Editor visibility and layout. */
	ui?: Pick<FieldUIConfig, "disabled" | "condition" | "width">;
	/** Checks applied when saving field values. */
	validation?: {
		/** Maximum number of repeated groups. */
		maxGroups?: number;
		/** Minimum number of repeated groups. */
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
