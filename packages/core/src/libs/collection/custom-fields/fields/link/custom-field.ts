import z from "zod";
import constants from "../../../../../constants/constants.js";
import type { LinkResValue, ServiceResponse } from "../../../../../types.js";
import { copy } from "../../../../i18n/index.js";
import CustomField from "../../custom-field.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../../types.js";
import keyToTitle from "../../utils/key-to-title.js";
import zodSafeParse from "../../utils/zod-safe-parse.js";
import { linkFieldConfig } from "./config.js";

class LinkCustomField extends CustomField<"link"> {
	type = linkFieldConfig.type;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"link">) {
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
			localized: this.props?.localized ?? false,
			default: this.props?.default ?? {
				url: null,
				label: null,
				target: null,
			},
			index: this.props?.index,
			ui: {
				hidden: this.props?.ui?.hidden,
				disabled: this.props?.ui?.disabled,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"link">;
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
	formatResponseValue(value?: LinkResValue | null) {
		return {
			url: value?.url ?? this.config.default.url ?? null,
			label: value?.label ?? this.config.default.label ?? null,
			target: value?.target ?? this.config.default.target ?? null,
		} satisfies CFResponse<"link">["value"];
	}
	override normalizeInputValue(value: unknown) {
		if (!value || typeof value !== "object" || Array.isArray(value))
			return value;

		const obj = value as Record<string, unknown>;

		return {
			...obj,
			url: typeof obj.url === "string" ? obj.url.trim() : obj.url,
			label: typeof obj.label === "string" ? obj.label.trim() : obj.label,
			target: typeof obj.target === "string" ? obj.target.trim() : obj.target,
		};
	}
	uniqueValidation(value: unknown) {
		const valueSchema = z.object({
			url: z.string().optional().nullable(),
			target: z.string().optional().nullable(),
			label: z.string().optional().nullable(),
		});

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		const val = value as NonNullable<LinkResValue>;

		if (
			val.target &&
			!constants.customFields.link.targets.includes(val.target)
		) {
			return {
				valid: false,
				message: copy(
					"server:core.fields.link.validation.target.error.message",
					{
						data: {
							valid: constants.customFields.link.targets.join(", "),
						},
					},
				),
			};
		}

		return {
			valid: true,
		};
	}
}

export default LinkCustomField;
