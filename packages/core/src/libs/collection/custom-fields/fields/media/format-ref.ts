import type { MediaPropsT } from "../../../../formatters/media.js";
import mediaFormatter from "../../../../formatters/media.js";
import type { CFResponse, FieldRefParams } from "../../types.js";

const isMediaProps = (value: unknown): value is MediaPropsT => {
	if (typeof value !== "object" || value === null) return false;

	return "id" in value && "key" in value && "mime_type" in value;
};

const formatMediaRef = (
	value: unknown,
	params: FieldRefParams,
): CFResponse<"media">["ref"] => {
	if (!isMediaProps(value)) return null;

	return mediaFormatter.formatRef({
		media: value,
		host: params.host,
		locales: params.localization.locales,
	}) satisfies CFResponse<"media">["ref"];
};

export default formatMediaRef;
