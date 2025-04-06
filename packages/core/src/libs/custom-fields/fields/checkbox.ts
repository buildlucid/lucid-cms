import T from "../../../translations/index.js";
import z from "zod";
import CustomField from "../custom-field.js";
import merge from "lodash.merge";
import keyToTitle from "../utils/key-to-title.js";
import zodSafeParse from "../utils/zod-safe-parse.js";
import Formatter from "../../formatters/index.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	CFInsertItem,
	SchemaDefinition,
	GetSchemaDefinitionProps,
} from "../types.js";
import type {
	FieldProp,
	FieldFormatMeta,
} from "../../formatters/collection-document-fields.js";
import type { FieldInsertItem } from "../../../services/collection-document-bricks/helpers/flatten-fields.js";
import type { BooleanInt } from "../../db/types.js";
import type { ServiceResponse } from "../../../types.js";

class CheckboxCustomField extends CustomField<"checkbox"> {
	type = "checkbox" as const;
	column = "bool_value" as const;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"checkbox">) {
		super();
		this.key = key;
		this.props = props;
		this.config = {
			key: this.key,
			type: this.type,
			details: {
				label: this.props?.details?.label ?? keyToTitle(this.key),
				summary: this.props?.details?.summary,
				true: this.props?.details?.true,
				false: this.props?.details?.false,
			},
			config: {
				useTranslations: this.props?.config?.useTranslations ?? false,
				default: this.props?.config?.default ?? false,
				isHidden: this.props?.config?.isHidden,
				isDisabled: this.props?.config?.isDisabled,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"checkbox">;
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
						type: props.db.getDataType("boolean"),
						nullable: true,
						default: props.db.formatInsertValue<BooleanInt>(
							"boolean",
							this.config.config.default,
						),
					},
				],
			},
			error: undefined,
		};
	}
	responseValueFormat(props: {
		data: FieldProp;
		formatMeta: FieldFormatMeta;
	}) {
		return {
			value: Formatter.formatBoolean(
				props.data.bool_value ?? this.config.config.default,
			),
			meta: null,
		} satisfies CFResponse<"checkbox">;
	}
	formatResponseValue(value?: BooleanInt | null) {
		return Formatter.formatBoolean(
			Boolean(value) ?? this.config.config.default,
		) satisfies CFResponse<"checkbox">["value"];
	}
	formatResponseMeta() {
		return null satisfies CFResponse<"checkbox">["meta"];
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
			boolValue: Boolean(props.item.value),
			jsonValue: null,
			mediaId: null,
			userId: null,
		} satisfies CFInsertItem<"checkbox">;
	}
	cfSpecificValidation(value: unknown) {
		const valueSchema = z.union([z.literal(1), z.literal(0), z.boolean()]);

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		return {
			valid: true,
		};
	}
	// Getters
	get errors() {
		return merge(super.errors, {
			required: {
				condition: (value: unknown) =>
					value === undefined || value === null || value === 0,
				message: T("checkbox_field_required"),
			},
		});
	}
}

export default CheckboxCustomField;
