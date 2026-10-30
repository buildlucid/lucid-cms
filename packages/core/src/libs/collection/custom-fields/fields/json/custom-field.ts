import z from "zod";
import type { ServiceResponse } from "../../../../../exports/types.js";
import { copy } from "../../../../i18n/index.js";
import CustomField from "../../custom-field.js";
import type {
	FieldConfig,
	FieldOptions,
	FieldResponse,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../../types.js";
import keyToTitle from "../../utils/key-to-title.js";
import zodSafeParse from "../../utils/zod-safe-parse.js";
import { jsonFieldConfig } from "./config.js";

class JsonCustomField extends CustomField<"json"> {
	type = jsonFieldConfig.type;
	config;
	key;
	props;
	constructor(key: string, props?: FieldOptions<"json">) {
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
				description: this.props?.details?.description,
				placeholder: this.props?.details?.placeholder,
			},
			localized: this.props?.localized ?? false,
			default: this.props?.default ?? null,
			index: this.props?.index,
			permissions: this.props?.permissions,
			ui: {
				hidden: this.props?.ui?.hidden,
				disabled: this.props?.ui?.disabled,
				condition: this.props?.ui?.condition,
				width: this.props?.ui?.width,
			},
			validation: this.props?.validation,
			ai: this.props?.ai,
		} satisfies FieldConfig<"json">;
	}
	getSchemaDefinition(
		props: GetSchemaDefinitionProps,
	): Awaited<ServiceResponse<SchemaDefinition>> {
		return {
			data: {
				columns: [
					{
						name: this.key,
						type: props.db.getDataType("json"),
						nullable: true,
						default: this.config.default,
					},
				],
			},
			error: undefined,
		};
	}
	formatResponseValue(value?: Record<string, unknown> | unknown[] | null) {
		return (value ??
			this.config.default ??
			null) satisfies FieldResponse<"json">["value"];
	}
	override normalizeInputValue(value: unknown) {
		if (typeof value === "string" && value.trim() === "") return null;
		return value;
	}
	uniqueValidation(value: unknown) {
		if (Array.isArray(value)) {
			return {
				valid: true,
			};
		}

		const valueSchema = z.record(
			z.union([z.string(), z.number(), z.symbol()]),
			z.unknown(),
		);

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		return {
			valid: true,
		};
	}
}

export default JsonCustomField;
