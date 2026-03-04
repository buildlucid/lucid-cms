import type { MediaPropsT } from "../../../../formatters/media.js";
import type { FieldRefParams } from "../../types.js";
import { mediaFieldConfig } from "./config.js";
import MediaCustomField from "./custom-field.js";
import fetchMediaRefs from "./fetch-refs.js";
import validateMediaInputData from "./validate-input.js";

const isMediaProps = (value: unknown): value is MediaPropsT => {
	if (typeof value !== "object" || value === null) return false;

	return "id" in value && "key" in value && "mime_type" in value;
};

const formatMediaRef = (value: unknown, params: FieldRefParams) => {
	if (!isMediaProps(value)) return null;
	return MediaCustomField.formatRef(value, params);
};

export default {
	config: mediaFieldConfig,
	class: MediaCustomField,
	fetchRefs: fetchMediaRefs,
	validateInput: validateMediaInputData,
	formatRef: formatMediaRef,
};
