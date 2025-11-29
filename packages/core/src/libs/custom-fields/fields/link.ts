import T from "../../../translations/index.js";
import z from "zod/v4";
import CustomField from "../custom-field.js";
import zodSafeParse from "../utils/zod-safe-parse.js";
import constants from "../../../constants/constants.js";
import type { LinkResValue, ServiceResponse } from "../../../types.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../types.js";
import keyToTitle from "../utils/key-to-title.js";

class LinkCustomField extends CustomField<"link"> {
	type = "link" as const;
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
				label: this.props?.details?.label ?? keyToTitle(this.key),
				summary: this.props?.details?.summary,
				placeholder: this.props?.details?.placeholder,
			},
			config: {
				useTranslations: this.props?.config?.useTranslations ?? false,
				default: this.props?.config?.default ?? {
					url: null,
					label: null,
					target: null,
				},
				isHidden: this.props?.config?.isHidden,
				isDisabled: this.props?.config?.isDisabled,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"link">;
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
						type: props.db.getDataType("json"),
						nullable: true,
						default: this.config.config.default,
					},
				],
			},
			error: undefined,
		};
	}
	formatResponseValue(value?: LinkResValue | null) {
		return {
			url: value?.url ?? this.config.config.default.url ?? null,
			label: value?.label ?? this.config.config.default.label ?? null,
			target: value?.target ?? this.config.config.default.target ?? null,
		} satisfies CFResponse<"link">["value"];
	}
	cfSpecificValidation(value: unknown) {
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
				message: T("field_link_target_error_message", {
					valid: constants.customFields.link.targets.join(", "),
				}),
			};
		}

		return {
			valid: true,
		};
	}
	get translationsEnabled() {
		return this.config.config.useTranslations;
	}
	get defaultValue() {
		return this.config.config.default;
	}
}

export default LinkCustomField;
