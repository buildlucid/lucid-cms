import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	FieldConfig,
	FieldTypes,
	FieldUIConfig,
	SharedFieldConfig,
	StructuralFieldOutput,
	TabFieldConfig,
} from "../../types.js";

export interface SectionFieldConfig extends SharedFieldConfig {
	type: "section";
	/** Copy shown beside the input in the admin. */
	details: {
		/** Field name shown to editors. */
		label?: AdminCopyInput;
		/** Help text explaining what to enter. */
		description?: AdminCopyInput;
	};
	/** Use nested to group child values under this field key, or inline to place them alongside siblings. Defaults to nested. */
	output: StructuralFieldOutput;
	/** Editor visibility and layout. */
	ui?: Pick<FieldUIConfig, "condition" | "width">;
	fields: Exclude<FieldConfig<FieldTypes>, TabFieldConfig>[];
}

export type SectionFieldProps = Partial<
	Omit<SectionFieldConfig, "key" | "type" | "fields">
>;

export type SectionResValue = null;

export type SectionCustomFieldMapItem = {
	props: SectionFieldProps;
	config: SectionFieldConfig;
	response: {
		value: SectionResValue;
	};
};
