import type { MediaType } from "../../../../../types/response.js";
import { createMediaUrl } from "../../../../../utils/media/index.js";
import formatter from "../../../../formatters/index.js";
import type { MediaPropsT } from "../../../../formatters/media.js";
import MediaFormatter from "../../../../formatters/media.js";
import type { CFResponse, FieldRefParams } from "../../types.js";

const isMediaProps = (value: unknown): value is MediaPropsT => {
	if (typeof value !== "object" || value === null) return false;

	return "id" in value && "key" in value && "mime_type" in value;
};

const isMediaType = (value: string): value is MediaType => {
	switch (value) {
		case "image":
		case "video":
		case "audio":
		case "document":
		case "archive":
		case "unknown":
			return true;
		default:
			return false;
	}
};

const formatMediaRef = (
	value: unknown,
	params: FieldRefParams,
): CFResponse<"media">["ref"] => {
	if (!isMediaProps(value)) return null;

	return {
		id: value.id,
		url: createMediaUrl({
			key: value.key,
			host: params.host,
			fileName: value.file_name,
		}),
		key: value.key,
		fileName: value.file_name,
		mimeType: value.mime_type,
		extension: value.file_extension,
		fileSize: value.file_size,
		width: value.width,
		height: value.height,
		blurHash: value.blur_hash,
		averageColor: value.average_color,
		isDark: formatter.formatBoolean(value.is_dark),
		isLight: formatter.formatBoolean(value.is_light),
		title: MediaFormatter.objectifyTranslations(
			"title",
			value.translations || [],
			params.localization.locales,
		),
		alt: MediaFormatter.objectifyTranslations(
			"alt",
			value.translations || [],
			params.localization.locales,
		),
		type: isMediaType(value.type) ? value.type : "unknown",
		public: formatter.formatBoolean(value.public),
		isDeleted: formatter.formatBoolean(value.is_deleted),
	} satisfies CFResponse<"media">["ref"];
};

export default formatMediaRef;
