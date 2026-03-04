import type { OmitDefault, SharedFieldConfig } from "../../types.js";

export interface UserFieldConfig extends SharedFieldConfig {
	type: "user";
	details: {
		label?: string | Record<string, string>;
		summary?: string | Record<string, string>;
	};
	config: {
		default?: number;
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
	};
	validation?: {
		required?: boolean;
	};
}

export type UserFieldProps = Partial<
	OmitDefault<Omit<UserFieldConfig, "type">>
>;

export type UserResValue = number | null;
export type UserRef = {
	id: number;
	username: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
} | null;

export type UserValidationData = {
	id: number;
	// username: string;
	// first_name: string | null;
	// last_name: string | null;
	// email: string;
};

export type UserCustomFieldMapItem = {
	props: UserFieldProps;
	config: UserFieldConfig;
	response: {
		value: UserResValue;
		ref: UserRef;
	};
};
