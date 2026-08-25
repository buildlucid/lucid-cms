import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export interface UserFieldConfig extends SharedFieldConfig {
	type: "user";
	resource: "users";
	details: {
		label?: AdminCopyInput;
		summary?: AdminCopyInput;
	};
	localized?: boolean;
	default?: number[];
	index?: true;
	multiple?: boolean;
	ui?: FieldUIConfig;
	validation?: {
		required?: boolean;
		minItems?: number;
		maxItems?: number;
	};
}

export type UserFieldProps = Partial<
	Omit<UserFieldConfig, "type" | "resource">
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
