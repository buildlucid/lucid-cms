import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	FieldUIConfig,
	FieldValidation,
	SharedFieldConfig,
} from "../../types.js";

export interface NumberFieldConfig extends SharedFieldConfig {
	type: "number";
	details: {
		label?: AdminCopyInput;
		description?: AdminCopyInput;
		placeholder?: AdminCopyInput;
	};
	localized?: boolean;
	default?: number | null;
	index?: boolean;
	ui?: FieldUIConfig;
	validation?: FieldValidation<number>;
}

export type NumberFieldProps = Partial<Omit<NumberFieldConfig, "key" | "type">>;

export type NumberResValue = number | null;

export type NumberCustomFieldMapItem = {
	props: NumberFieldProps;
	config: NumberFieldConfig;
	response: {
		value: NumberResValue;
	};
};
