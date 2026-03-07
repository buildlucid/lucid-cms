import { createFieldRefFetchPlan } from "../../utils/ref-fetch.js";
import { userFieldConfig } from "./config.js";
import UserCustomField from "./custom-field.js";
import fetchUserRefs from "./fetch-refs.js";
import formatUserRef from "./format-ref.js";
import validateUserInputData from "./validate-input.js";

export default {
	config: userFieldConfig,
	class: UserCustomField,
	planFetchRefs: createFieldRefFetchPlan,
	fetchRefs: fetchUserRefs,
	validateInput: validateUserInputData,
	formatRef: formatUserRef,
};
