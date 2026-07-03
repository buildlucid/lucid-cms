import z from "zod";
import type { ServiceResponse } from "../../../../../types.js";
import { isJsonContainerValue } from "../../../../../utils/helpers/index.js";
import { copy } from "../../../../i18n/index.js";
import CustomField from "../../custom-field.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	CustomFieldAiFormatResponse,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../../types.js";
import { zodToJsonSchema } from "../../utils/helpers.js";
import keyToTitle from "../../utils/key-to-title.js";
import zodSafeParse from "../../utils/zod-safe-parse.js";
import { jsonFieldConfig } from "./config.js";

class JsonCustomField extends CustomField<"json"> {
	type = jsonFieldConfig.type;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"json">) {
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
				placeholder: this.props?.details?.placeholder,
			},
			ai: this.props?.ai,
			localized: this.props?.localized ?? false,
			default: this.props?.default ?? {},
			index: this.props?.index,
			ui: {
				hidden: this.props?.ui?.hidden,
				disabled: this.props?.ui?.disabled,
				condition: this.props?.ui?.condition,
				width: this.props?.ui?.width,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"json">;
	}
	override get supportsAi() {
		return true;
	}
	override get jsonSchema() {
		return zodToJsonSchema(this.config.validation?.zod, {
			type: "string",
			description:
				"A serialized JSON value. Return only JSON.stringify(value) for the generated JSON field value. The decoded value may be an object, array, string, number, boolean, or null.",
		});
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
			null) satisfies CFResponse<"json">["value"];
	}
	override formatAiGeneratedValue(value: unknown): CustomFieldAiFormatResponse {
		if (typeof value === "string") {
			try {
				const parsed = JSON.parse(value) as unknown;

				return {
					success: true,
					value: isJsonContainerValue(parsed) ? parsed : { value: parsed },
				};
			} catch {
				return {
					success: true,
					value: { value },
				};
			}
		}

		if (isJsonContainerValue(value)) {
			return {
				success: true,
				value,
			};
		}

		return {
			success: true,
			value: { value },
		};
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
