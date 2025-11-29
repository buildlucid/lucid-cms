import z from "zod/v4";
import T from "../../../translations/index.js";
import type { MediaType, ServiceResponse } from "../../../types.js";
import { createMediaUrl } from "../../../utils/media/index.js";
import formatter from "../../formatters/index.js";
import MediaFormatter, { type MediaPropsT } from "../../formatters/media.js";
import CustomField from "../custom-field.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	FieldRefParams,
	GetSchemaDefinitionProps,
	MediaReferenceData,
	SchemaDefinition,
} from "../types.js";
import keyToTitle from "../utils/key-to-title.js";
import zodSafeParse from "../utils/zod-safe-parse.js";

class MediaCustomField extends CustomField<"media"> {
	type = "media" as const;
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
	static formatRef(
		value: MediaPropsT | undefined | null,
		params: FieldRefParams,
	) {
		if (value === null || value === undefined) return null;
		return {
			id: value.id,
			url: createMediaUrl({
				key: value.key,
				host: params.config.host,
				urlStrategy: params.config.media?.urlStrategy,
			}),
			key: value.key,
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
			type: value.type as MediaType,
			public: formatter.formatBoolean(value.public),
			isDeleted: formatter.formatBoolean(value.is_deleted),
		} satisfies CFResponse<"media">["ref"];
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
					message: T("field_media_doesnt_have_type"),
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
					message: T("field_media_doesnt_have_width"),
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
					message: T("field_media_doesnt_have_height"),
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
