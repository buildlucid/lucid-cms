import T from "../../../translations/index.js";
import z from "zod";
import CustomField from "../custom-field.js";
import zodSafeParse from "../utils/zod-safe-parse.js";
import Formatter from "../../formatters/index.js";
import constants from "../../../constants/constants.js";
import type { LinkResValue } from "../../../types.js";
import type { CFConfig, CFProps, CFResponse, CFInsertItem } from "../types.js";
import keyToTitle from "../utils/key-to-title.js";
import type {
	FieldProp,
	FieldFormatMeta,
} from "../../formatters/collection-document-fields.js";
import type { FieldInsertItem } from "../../../services/collection-document-bricks/helpers/flatten-fields.js";

class LinkCustomField extends CustomField<"link"> {
	type = "link" as const;
	column = "text_value" as const;
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
	responseValueFormat(props: {
		data: FieldProp;
		formatMeta: FieldFormatMeta;
	}) {
		const linkVal = Formatter.parseJSON<LinkResValue>(props.data.json_value);
		return {
			value: {
				url: linkVal?.url ?? this.config.config.default.url ?? null,
				label: linkVal?.label ?? this.config.config.default.label ?? null,
				target: linkVal?.target ?? this.config.config.default.target ?? null,
			},
			meta: null,
		} satisfies CFResponse<"link">;
	}
	getInsertField(props: {
		item: FieldInsertItem;
		brickId: number;
		groupId: number | null;
	}) {
		const value = props.item.value as LinkResValue | undefined;

		return {
			key: this.config.key,
			type: this.config.type,
			localeCode: props.item.localeCode,
			collectionBrickId: props.brickId,
			groupId: props.groupId,
			textValue: value ? value.url : null,
			intValue: null,
			boolValue: null,
			jsonValue: value
				? Formatter.stringifyJSON({
						target: value.target,
						label: value.label,
					})
				: null,
			mediaId: null,
			userId: null,
		} satisfies CFInsertItem<"link">;
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
}

export default LinkCustomField;
