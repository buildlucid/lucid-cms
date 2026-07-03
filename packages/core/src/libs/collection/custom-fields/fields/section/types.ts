import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	CFConfig,
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
		summary?: AdminCopyInput;
	};
	/** Controls how child fields are shaped in client document responses. */
	output: StructuralFieldOutput;
	ui?: Pick<FieldUIConfig, "condition" | "width">;
	fields: Exclude<CFConfig<FieldTypes>, TabFieldConfig>[];
}

export type SectionFieldProps = Partial<
	Omit<SectionFieldConfig, "type" | "fields">
>;

export type SectionResValue = null;
export type SectionRef = null;

export type SectionCustomFieldMapItem = {
	props: SectionFieldProps;
	config: SectionFieldConfig;
	response: {
		value: SectionResValue;
		ref: SectionRef;
	};
};
