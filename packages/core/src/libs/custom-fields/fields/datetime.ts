import T from "../../../translations/index.js";
import z from "zod";
import CustomField from "../custom-field.js";
import keyToTitle from "../utils/key-to-title.js";
import zodSafeParse from "../utils/zod-safe-parse.js";
import { isValid } from "date-fns";
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

class DatetimeCustomField extends CustomField<"datetime"> {
	type = "datetime" as const;
	column = "text_value" as const;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"datetime">) {
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
				default: this.props?.config?.default ?? "",
				isHidden: this.props?.config?.isHidden,
				isDisabled: this.props?.config?.isDisabled,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"datetime">;
	}
	// Methods
	getSchemaDefinition(props: GetSchemaDefinitionProps): SchemaDefinition {
		return {
			columns: [
				{
					name: this.key,
					type: props.db.getColumnType("timestamp"),
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
			value: props.data.text_value ?? this.config.config.default ?? null,
			meta: null,
		} satisfies CFResponse<"datetime">;
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
		} satisfies CFInsertItem<"datetime">;
	}
	cfSpecificValidation(value: unknown) {
		const valueSchema = z.union([z.string(), z.number(), z.date()]);

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		const date = new Date(value as string | number | Date);
		if (!isValid(date)) {
			return {
				valid: false,
				message: T("field_date_invalid"),
			};
		}

		return {
			valid: true,
		};
	}
}

export default DatetimeCustomField;
