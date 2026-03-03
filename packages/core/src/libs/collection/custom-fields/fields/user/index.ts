import UserCustomField from "./custom-field.js";
import fetchUserRefs from "./fetch-refs.js";
import validateUserInputData from "./validate-input.js";

export default {
	class: UserCustomField,
	fetchRefs: fetchUserRefs,
	validateInput: validateUserInputData,
};
