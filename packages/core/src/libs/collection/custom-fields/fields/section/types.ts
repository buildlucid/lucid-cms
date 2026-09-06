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
	details: {
		label?: AdminCopyInput;
		description?: AdminCopyInput;
	};
	/** Controls how child fields are shaped in content API document responses. */
	output: StructuralFieldOutput;
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
