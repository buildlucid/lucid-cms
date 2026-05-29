import z from "zod";
import type { ServiceResponse } from "../../../../../types.js";
import { copy } from "../../../../i18n/index.js";
import prefixGeneratedColName from "../../../helpers/prefix-generated-column-name.js";
import CustomField from "../../custom-field.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	CustomFieldErrorItem,
	CustomFieldValidationError,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../../types.js";
import keyToTitle from "../../utils/key-to-title.js";
import {
	clampRelationInputValue,
	normalizeStoredRelationValues,
} from "../../utils/normalize-relation-values.js";
import { validateRelationItemCount } from "../../utils/relation-item-count-validation.js";
import zodSafeParse from "../../utils/zod-safe-parse.js";
import { mediaFieldConfig } from "./config.js";
import type { MediaValidationData } from "./types.js";

class MediaCustomField extends CustomField<"media"> {
	type = mediaFieldConfig.type;
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
				label:
					this.props?.details?.label ??
					copy(`admin:fields.${this.type}.${this.key}.label`, {
						defaultMessage: keyToTitle(this.key),
					}),
				summary: this.props?.details?.summary,
			},
			config: {
				localized: this.props?.config?.localized ?? false,
				default: this.props?.config?.default ?? [],
				hidden: this.props?.config?.hidden,
				disabled: this.props?.config?.disabled,
				index: this.props?.config?.index,
				multiple: this.props?.config?.multiple,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"media">;
	}
	override normalizeInputValue(value: unknown) {
		return clampRelationInputValue(value, this.config.config.multiple);
	}
	override get defaultValue(): unknown {
		return normalizeStoredRelationValues(
			this.config.config.default,
			this.config.config.multiple,
		);
	}
	override get errors(): {
		fieldType: CustomFieldErrorItem;
		required: CustomFieldErrorItem;
		zod: CustomFieldErrorItem;
	} {
		return {
			...super.errors,
			required: {
				condition: (value: unknown) =>
					value === undefined ||
					value === null ||
					(Array.isArray(value) && value.length === 0),
				message: copy("server:core.fields.validation.required"),
			},
		};
	}
	getSchemaDefinition(
		props: GetSchemaDefinitionProps,
	): Awaited<ServiceResponse<SchemaDefinition>> {
		return {
			data: {
				columns: [
					{
						name: "media_id",
						type: props.db.getDataType("integer"),
						nullable: false,
						foreignKey: {
							table: "lucid_media",
							column: "id",
							onDelete: "cascade",
						},
					},
				],
			},
			error: undefined,
		};
	}
	formatResponseValue(value: unknown) {
		return normalizeStoredRelationValues(
			value,
			this.config.config.multiple,
		) satisfies CFResponse<"media">["value"];
	}
	override get relationValueColumn() {
		return "media_id";
	}
	override serializeRelationFieldValue(
		value: unknown,
	): Array<Record<string, unknown>> {
		return normalizeStoredRelationValues(
			value,
			this.config.config.multiple,
		).map((mediaId) => ({
			[prefixGeneratedColName("media_id")]: mediaId,
		}));
	}
	uniqueValidation(value: unknown, refData?: MediaValidationData[]) {
		const valueSchema = z.array(z.number());
		const candidateValue = clampRelationInputValue(
			value,
			this.config.config.multiple,
		);
		const valueValidate = zodSafeParse(candidateValue, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		const normalizedValue = Array.isArray(candidateValue)
			? candidateValue.filter(
					(item): item is number => typeof item === "number",
				)
			: [];
		const itemCountValidation = validateRelationItemCount({
			multiple: this.config.config.multiple,
			length: normalizedValue.length,
			validation: this.config.validation,
		});
		if (!itemCountValidation.valid) return itemCountValidation;

		const errors: CustomFieldValidationError[] = [];
		for (const [itemIndex, mediaId] of normalizedValue.entries()) {
			const findMedia = refData?.find((m) => m.id === mediaId);
			if (findMedia === undefined) {
				errors.push({
					itemIndex,
					message: copy("server:core.fields.media.validation.not.found"),
				});
				continue;
			}

			// Check if value is in the options
			if (this.config.validation?.extensions?.length) {
				const extension = findMedia.file_extension;
				if (!this.config.validation.extensions.includes(extension)) {
					errors.push({
						itemIndex,
						message: copy(
							"server:core.fields.media.validation.extension.invalid",
							{
								data: {
									extensions: this.config.validation.extensions.join(", "),
								},
							},
						),
					});
				}
			}

			// Check type
			if (this.config.validation?.type) {
				const type = findMedia.type;
				if (!type) {
					errors.push({
						itemIndex,
						message: copy("server:core.fields.media.validation.type.missing"),
					});
					continue;
				}

				if (this.config.validation.type !== type) {
					errors.push({
						itemIndex,
						message: copy("server:core.fields.media.validation.type.invalid", {
							data: {
								type: this.config.validation.type,
							},
						}),
					});
				}
			}

			// Check width
			if (this.config.validation?.width && findMedia.type === "image") {
				const width = findMedia.width;
				if (!width) {
					errors.push({
						itemIndex,
						message: copy("server:core.fields.media.validation.width.missing"),
					});
					continue;
				}

				if (
					this.config.validation.width.min &&
					width < this.config.validation.width.min
				) {
					errors.push({
						itemIndex,
						message: copy("server:core.fields.media.validation.width.min", {
							data: {
								min: this.config.validation.width.min,
							},
						}),
					});
				}
				if (
					this.config.validation.width.max &&
					width > this.config.validation.width.max
				) {
					errors.push({
						itemIndex,
						message: copy("server:core.fields.media.validation.width.max", {
							data: {
								max: this.config.validation.width.max,
							},
						}),
					});
				}
			}

			// Check height
			if (this.config.validation?.height && findMedia.type === "image") {
				const height = findMedia.height;
				if (!height) {
					errors.push({
						itemIndex,
						message: copy("server:core.fields.media.validation.height.missing"),
					});
					continue;
				}

				if (
					this.config.validation.height.min &&
					height < this.config.validation.height.min
				) {
					errors.push({
						itemIndex,
						message: copy("server:core.fields.media.validation.height.min", {
							data: {
								min: this.config.validation.height.min,
							},
						}),
					});
				}
				if (
					this.config.validation.height.max &&
					height > this.config.validation.height.max
				) {
					errors.push({
						itemIndex,
						message: copy("server:core.fields.media.validation.height.max", {
							data: {
								max: this.config.validation.height.max,
							},
						}),
					});
				}
			}
		}

		if (errors.length > 0) {
			return {
				valid: false,
				errors,
			};
		}

		return { valid: true };
	}
}

export default MediaCustomField;
