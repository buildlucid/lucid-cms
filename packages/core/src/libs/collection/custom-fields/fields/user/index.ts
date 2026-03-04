import type { UserPropT } from "../../../../formatters/users.js";
import type { FieldRefParams } from "../../types.js";
import { userFieldConfig } from "./config.js";
import UserCustomField from "./custom-field.js";
import fetchUserRefs from "./fetch-refs.js";
import validateUserInputData from "./validate-input.js";

const isUserRef = (value: unknown): value is UserPropT => {
	if (typeof value !== "object" || value === null) return false;

	return "id" in value && "email" in value && "username" in value;
};

const formatUserRef = (value: unknown, _params: FieldRefParams) => {
	if (!isUserRef(value)) return null;
	return UserCustomField.formatRef(value);
};

export default {
	config: userFieldConfig,
	class: UserCustomField,
	fetchRefs: fetchUserRefs,
	validateInput: validateUserInputData,
	formatRef: formatUserRef,
};
