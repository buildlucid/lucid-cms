import { mediaFieldConfig } from "./config.js";
import MediaCustomField from "./custom-field.js";
import fetchMediaRefs from "./fetch-refs.js";
import formatMediaRef from "./format-ref.js";
import validateMediaInputData from "./validate-input.js";

export default {
	config: mediaFieldConfig,
	class: MediaCustomField,
	fetchRefs: fetchMediaRefs,
	validateInput: validateMediaInputData,
	formatRef: formatMediaRef,
};
