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
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../../types.js";
import keyToTitle from "../../utils/key-to-title.js";
import zodSafeParse from "../../utils/zod-safe-parse.js";
import { rangeFieldConfig } from "./config.js";
import {
	normalizeRangeInputValue,
	normalizeStoredRangeValues,
} from "./values.js";

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 100;
const DEFAULT_STEP = 1;

class RangeCustomField extends CustomField<"range"> {
	type = rangeFieldConfig.type;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"range">) {
		super();
		this.key = key;
		this.props = props;

		const min = this.props?.min ?? DEFAULT_MIN;
		const max = this.props?.max ?? DEFAULT_MAX;
		const step = this.props?.step ?? DEFAULT_STEP;
		const thumbs = this.props?.thumbs;
		const defaultValue =
			this.props?.default ?? (thumbs === 2 ? [min, max] : [min]);

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
			min,
			max,
			step,
			localized: this.props?.localized ?? false,
			default: normalizeStoredRangeValues(defaultValue, thumbs),
			index: this.props?.index,
			thumbs,
			ui: {
				hidden: this.props?.ui?.hidden,
				disabled: this.props?.ui?.disabled,
				condition: this.props?.ui?.condition,
				width: this.props?.ui?.width,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"range">;
	}
	override normalizeInputValue(value: unknown) {
		return normalizeRangeInputValue(value, this.config.thumbs);
	}
	override get defaultValue(): unknown {
		return normalizeStoredRangeValues(this.config.default, this.config.thumbs);
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
						name: "value",
						type: props.db.getDataType("real"),
						nullable: false,
					},
				],
			},
			error: undefined,
		};
	}
	formatResponseValue(value: unknown) {
		const normalized = normalizeStoredRangeValues(value, this.config.thumbs);
		return (
			normalized.length > 0
				? normalized
				: normalizeStoredRangeValues(this.config.default, this.config.thumbs)
		) satisfies CFResponse<"range">["value"];
	}
	override get relationValueColumn() {
		return "value";
	}
	override serializeRelationFieldValue(
		value: unknown,
	): Array<Record<string, unknown>> {
		return normalizeStoredRangeValues(value, this.config.thumbs).map(
			(rangeValue) => ({
				[prefixGeneratedColName("value")]: rangeValue,
			}),
		);
	}
	uniqueValidation(value: unknown) {
		const expectedLength = this.config.thumbs === 2 ? 2 : 1;
		const valueSchema = z
			.array(z.number().min(this.config.min).max(this.config.max))
			.refine(
				(values) => values.length === 0 || values.length === expectedLength,
				{
					message: `Expected ${expectedLength} range value${expectedLength === 1 ? "" : "s"}`,
				},
			)
			.refine(
				(values) =>
					values.every((item) => {
						const steps = (item - this.config.min) / this.config.step;
						return Math.abs(steps - Math.round(steps)) < 1e-9;
					}),
				{
					message: `Range values must align to a step of ${this.config.step}`,
				},
			);

		return zodSafeParse(value, valueSchema);
	}
}

export default RangeCustomField;
