import T from "../../../translations/index.js";
import z from "zod";
import CustomField from "../custom-field.js";
import keyToTitle from "../utils/key-to-title.js";
import { createCdnUrl } from "../../../utils/media/index.js";
import zodSafeParse from "../utils/zod-safe-parse.js";
import { objectifyTranslations } from "../../../utils/translations/index.js";
import type { MediaType } from "../../../types.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	CFInsertItem,
	MediaReferenceData,
} from "../types.js";
import type {
	FieldProp,
	FieldFormatMeta,
} from "../../formatters/collection-document-fields.js";
import type { FieldInsertItem } from "../../../services/collection-document-bricks/helpers/flatten-fields.js";

class MediaCustomField extends CustomField<"media"> {
	type = "media" as const;
	column = "media_id" as const;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"media">) {
		super();
		this.key = key;
		this.props = props;
		this.config = {
			key: this.key,
			type: this.type,
			details: {
				label: this.props?.details?.label ?? keyToTitle(this.key),
				summary: this.props?.details?.summary,
			},
			config: {
				useTranslations: this.props?.config?.useTranslations ?? false,
				isHidden: this.props?.config?.isHidden,
				isDisabled: this.props?.config?.isDisabled,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"media">;
	}
	// Methods
	responseValueFormat(props: {
		data: FieldProp;
		formatMeta: FieldFormatMeta;
	}) {
		return {
			value: props.data?.media_id ?? null,
			meta: {
				id: props.data?.media_id ?? null,
				url: createCdnUrl(props.formatMeta.host, props.data?.media_key ?? ""),
				key: props.data?.media_key ?? null,
				mimeType: props.data?.media_mime_type ?? null,
				extension: props.data?.media_file_extension ?? null,
				fileSize: props.data?.media_file_size ?? null,
				width: props.data?.media_width ?? null,
				height: props.data?.media_height ?? null,
				blurHash: props.data?.media_blur_hash ?? null,
				averageColour: props.data?.media_average_colour ?? null,
				isDark: props.data?.media_is_dark ?? null,
				isLight: props.data?.media_is_light ?? null,
				title: objectifyTranslations(
					props.data?.media_title_translations || [],
					props.formatMeta.localisation.locales,
				),
				alt: objectifyTranslations(
					props.data?.media_alt_translations || [],
					props.formatMeta.localisation.locales,
				),
				type: (props.data?.media_type as MediaType) ?? null,
			},
		} satisfies CFResponse<"media">;
	}
	getInsertField(props: {
		item: FieldInsertItem;
		brickId: number;
		groupId: number | null;
	}) {
		return {
			key: this.config.key,
			type: this.config.type,
			localeCode: props.item.localeCode,
			collectionBrickId: props.brickId,
			groupId: props.groupId,
			textValue: null,
			intValue: null,
			boolValue: null,
			jsonValue: null,
			mediaId: props.item.value,
			userId: null,
		} satisfies CFInsertItem<"media">;
	}
	cfSpecificValidation(value: unknown, relationData?: MediaReferenceData[]) {
		const valueSchema = z.number();

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		const findMedia = relationData?.find((m) => m.id === value);

		if (findMedia === undefined) {
			return {
				valid: false,
				message: T("field_media_not_found"),
			};
		}

		// Check if value is in the options
		if (this.config.validation?.extensions?.length) {
			const extension = findMedia.file_extension;
			if (!this.config.validation.extensions.includes(extension)) {
				return {
					valid: false,
					message: T("field_media_extension", {
						extensions: this.config.validation.extensions.join(", "),
					}),
				};
			}
		}

		// Check type
		if (this.config.validation?.type) {
			const type = findMedia.type;
			if (!type) {
				return {
					valid: false,
					message: T("field_media_doenst_have_type"),
				};
			}

			if (this.config.validation.type !== type) {
				return {
					valid: false,
					message: T("field_media_type", {
						type: this.config.validation.type,
					}),
				};
			}
		}

		// Check width
		if (this.config.validation?.width && findMedia.type === "image") {
			const width = findMedia.width;
			if (!width) {
				return {
					valid: false,
					message: T("field_media_doenst_have_width"),
				};
			}

			if (
				this.config.validation.width.min &&
				width < this.config.validation.width.min
			) {
				return {
					valid: false,
					message: T("field_media_min_width", {
						min: this.config.validation.width.min,
					}),
				};
			}
			if (
				this.config.validation.width.max &&
				width > this.config.validation.width.max
			) {
				return {
					valid: false,
					message: T("field_media_max_width", {
						max: this.config.validation.width.max,
					}),
				};
			}
		}

		// Check height
		if (this.config.validation?.height && findMedia.type === "image") {
			const height = findMedia.height;
			if (!height) {
				return {
					valid: false,
					message: T("field_media_doenst_have_height"),
				};
			}

			if (
				this.config.validation.height.min &&
				height < this.config.validation.height.min
			) {
				return {
					valid: false,
					message: T("field_media_min_height", {
						min: this.config.validation.height.min,
					}),
				};
			}
			if (
				this.config.validation.height.max &&
				height > this.config.validation.height.max
			) {
				return {
					valid: false,
					message: T("field_media_max_height", {
						max: this.config.validation.height.max,
					}),
				};
			}
		}

		return { valid: true };
	}
}

export default MediaCustomField;
