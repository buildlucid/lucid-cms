import z from "zod";
import CustomField from "../custom-field.js";
import keyToTitle from "../utils/key-to-title.js";
import zodSafeParse from "../utils/zod-safe-parse.js";
import { typeLookup } from "../../db/kysely/column-helpers.js";
import type {
	CFConfig,
	CFProps,
	CFInsertItem,
	CFResponse,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../types.js";
import type {
	FieldProp,
	FieldFormatMeta,
} from "../../formatters/collection-document-fields.js";
import type { FieldInsertItem } from "../../../services/collection-document-bricks/helpers/flatten-fields.js";

class TextCustomField extends CustomField<"text"> {
	type = "text" as const;
	column = "text_value" as const;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"text">) {
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
		} satisfies CFConfig<"text">;
	}
	// Methods
	getSchemaDefinition(props: GetSchemaDefinitionProps): SchemaDefinition {
		return {
			columns: [
				{
					name: this.key,
					type: typeLookup("text", props.adapterType),
					nullable: true,
					default: this.config.config.default,
				},
			],
		};
	}
	responseValueFormat(props: {
		data: FieldProp;
		formatMeta: FieldFormatMeta;
	}) {
		return {
			value: props.data.text_value ?? this.config.config.default,
			meta: null,
		} satisfies CFResponse<"text">;
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
		} satisfies CFInsertItem<"text">;
	}
	cfSpecificValidation(value: unknown) {
		const valueSchema = z.string();

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		return {
			valid: true,
		};
	}
}

export default TextCustomField;
