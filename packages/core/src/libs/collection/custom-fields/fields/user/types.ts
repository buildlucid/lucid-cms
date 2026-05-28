import type { ProfilePicture } from "../../../../../types/response.js";
import type { AdminText } from "../../../../i18n/types.js";
import type { SharedFieldConfig } from "../../types.js";

export interface UserFieldConfig extends SharedFieldConfig {
	type: "user";
	details: {
		label?: AdminText;
		summary?: AdminText;
	};
	config: {
		default?: number[];
		localized?: boolean;
		hidden?: boolean;
		disabled?: boolean;
		index?: true;
		multiple?: boolean;
	};
	validation?: {
		required?: boolean;
		minItems?: number;
		maxItems?: number;
	};
}

export type UserFieldProps = Partial<Omit<UserFieldConfig, "type">>;

export type UserResValue = number[];
export type UserRef = {
	id: number;
	username: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	profilePicture: ProfilePicture | null;
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
