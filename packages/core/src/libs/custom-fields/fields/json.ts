import z from "zod";
import CustomField from "../custom-field.js";
import keyToTitle from "../utils/key-to-title.js";
import zodSafeParse from "../utils/zod-safe-parse.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	CFInsertItem,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../types.js";
import type {
	FieldProp,
	FieldFormatMeta,
} from "../../formatters/collection-document-fields.js";
import type { FieldInsertItem } from "../../../services/collection-document-bricks/helpers/flatten-fields.js";

class JsonCustomField extends CustomField<"json"> {
	type = "json" as const;
	column = "json_value" as const;
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
				label: this.props?.details?.label ?? keyToTitle(this.key),
				summary: this.props?.details?.summary,
				placeholder: this.props?.details?.placeholder,
			},
			config: {
				useTranslations: this.props?.config?.useTranslations ?? false,
				default: this.props?.config?.default || {},
				isHidden: this.props?.config?.isHidden,
				isDisabled: this.props?.config?.isDisabled,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"json">;
	}
	// Methods
	getSchemaDefinition(props: GetSchemaDefinitionProps): SchemaDefinition {
		return {
			columns: [
				{
					name: this.key,
					type: props.db.getColumnType("jsonb"),
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
			value: props.data.json_value ?? this.config.config.default ?? null,
			meta: null,
		} satisfies CFResponse<"json">;
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
			textValue: null,
			intValue: null,
			boolValue: null,
			jsonValue: props.item.value,
			mediaId: null,
			userId: null,
		} satisfies CFInsertItem<"json">;
	}
	cfSpecificValidation(value: unknown) {
		const valueSchema = z.record(z.unknown());

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		return {
			valid: true,
		};
	}
}

export default JsonCustomField;
