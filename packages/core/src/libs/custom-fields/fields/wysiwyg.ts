import z from "zod";
import CustomField from "../custom-field.js";
import sanitizeHtml from "sanitize-html";
import zodSafeParse from "../utils/zod-safe-parse.js";
import keyToTitle from "../utils/key-to-title.js";
import type { CFConfig, CFProps, CFResponse, CFInsertItem } from "../types.js";
import type {
	FieldProp,
	FieldFormatMeta,
} from "../../formatters/collection-document-fields.js";
import type { FieldInsertItem } from "../../../services/collection-document-bricks/helpers/flatten-fields.js";

class WysiwygCustomField extends CustomField<"wysiwyg"> {
	type = "wysiwyg" as const;
	column = "text_value" as const;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"wysiwyg">) {
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
				useTranslations: this.props?.config?.useTranslations ?? true,
				default: this.props?.config?.default ?? "",
				isHidden: this.props?.config?.isHidden,
				isDisabled: this.props?.config?.isDisabled,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"wysiwyg">;
	}
	// Methods
	responseValueFormat(props: {
		data: FieldProp;
		formatMeta: FieldFormatMeta;
	}) {
		return {
			value: props.data.text_value ?? this.config.config.default ?? null,
			meta: null,
		} satisfies CFResponse<"wysiwyg">;
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
			textValue: props.item.value,
			intValue: null,
			boolValue: null,
			jsonValue: null,
			mediaId: null,
			userId: null,
		} satisfies CFInsertItem<"wysiwyg">;
	}
	cfSpecificValidation(value: string) {
		const valueSchema = z.string();

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		const sanitizedValue = sanitizeHtml(value);

		if (this.config.validation?.zod) {
			return zodSafeParse(sanitizedValue, this.config.validation?.zod);
		}

		return { valid: true };
	}
}

export default WysiwygCustomField;
