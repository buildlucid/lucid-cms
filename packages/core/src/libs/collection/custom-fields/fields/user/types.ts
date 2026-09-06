import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export interface UserFieldConfig extends SharedFieldConfig {
	type: "user";
	resource: "users";
	details: {
		label?: AdminCopyInput;
		description?: AdminCopyInput;
	};
	localized?: boolean;
	default?: number[];
	index?: boolean;
	multiple?: boolean;
	ui?: FieldUIConfig;
	validation?: {
		required?: boolean;
		minItems?: number;
		maxItems?: number;
	};
}

export type UserFieldProps = Partial<
	Omit<UserFieldConfig, "key" | "type" | "resource">
>;

export type UserResValue = number[];

export type UserValidationData = {
	id: number;
};

export type UserCustomFieldMapItem = {
	props: UserFieldProps;
	config: UserFieldConfig;
	response: {
		value: UserResValue;
	};
};
