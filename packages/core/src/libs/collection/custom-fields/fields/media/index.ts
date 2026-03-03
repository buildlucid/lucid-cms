import MediaCustomField from "./custom-field.js";
import fetchMediaRefs from "./fetch-refs.js";
import validateMediaInputData from "./validate-input.js";

export default {
	class: MediaCustomField,
	fetchRefs: fetchMediaRefs,
	validateInput: validateMediaInputData,
};
