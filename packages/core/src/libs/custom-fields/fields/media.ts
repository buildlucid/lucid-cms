import T from "../../../translations/index.js";
import z from "zod";
import CustomField from "../custom-field.js";
import keyToTitle from "../utils/key-to-title.js";
import { createCdnUrl } from "../../../utils/media/index.js";
import zodSafeParse from "../utils/zod-safe-parse.js";
import { objectifyTranslations } from "../../../utils/translations/index.js";
import Formatter from "../../formatters/index.js";
import type { MediaType, ServiceResponse } from "../../../types.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	MediaReferenceData,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../types.js";
import type { FieldFormatMeta } from "../../formatters/document-fields.js";
import type { MediaPropsT } from "../../formatters/media.js";

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
	getSchemaDefinition(
		props: GetSchemaDefinitionProps,
	): Awaited<ServiceResponse<SchemaDefinition>> {
		return {
			data: {
				columns: [
					{
						name: this.key,
						type: props.db.getDataType("integer"),
						nullable: true,
						foreignKey: {
							table: "lucid_media",
							column: "id",
							onDelete: "set null",
						},
					},
				],
			},
			error: undefined,
		};
	}
	formatResponseValue(value?: number | null) {
		return (value ?? null) satisfies CFResponse<"media">["value"];
	}
	formatResponseMeta(
		value: MediaPropsT | undefined | null,
		meta: FieldFormatMeta,
	) {
		if (value === null || value === undefined) return null;
		return {
			id: value?.id ?? null,
			url: createCdnUrl(meta.host, value?.key ?? ""),
			key: value?.key ?? null,
			mimeType: value?.mime_type ?? null,
			extension: value?.file_extension ?? null,
			fileSize: value?.file_size ?? null,
			width: value?.width ?? null,
			height: value?.height ?? null,
			blurHash: value?.blur_hash ?? null,
			averageColour: value?.average_colour ?? null,
			isDark: Formatter.formatBoolean(value?.is_dark ?? null),
			isLight: Formatter.formatBoolean(value?.is_light ?? null),
			title: objectifyTranslations(
				value?.title_translations || [],
				meta.localisation.locales,
			),
			alt: objectifyTranslations(
				value?.alt_translations || [],
				meta.localisation.locales,
			),
			type: (value?.type as MediaType) ?? null,
		} satisfies CFResponse<"media">["meta"];
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
	get translationsEnabled() {
		return this.config.config.useTranslations;
	}
	get defaultValue() {
		return null;
	}
}

export default MediaCustomField;
