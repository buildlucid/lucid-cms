import T from "../../../translations/index.js";
import z from "zod";
import CustomField from "../custom-field.js";
import keyToTitle from "../utils/key-to-title.js";
import zodSafeParse from "../utils/zod-safe-parse.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	CFInsertItem,
	UserReferenceData,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../types.js";
import type {
	FieldProp,
	FieldFormatMeta as FieldFormatMetaOld,
} from "../../formatters/collection-document-fields.js";
import type { FieldFormatMeta } from "../../formatters/document-fields.js";
import type { FieldInsertItem } from "../../../services/collection-document-bricks/helpers/flatten-fields.js";
import type { ServiceResponse } from "../../../types.js";
import type { UserPropT } from "../../formatters/users.js";

class UserCustomField extends CustomField<"user"> {
	type = "user" as const;
	column = "user_id" as const;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"user">) {
		super();
		this.key = key;
		this.props = props;
		this.config = {
			key: this.key,
			type: this.type,
			details: {
				label: this.props?.details?.label ?? keyToTitle(this.key),
				summary: this.props?.details?.summary,
			},
			config: {
				useTranslations: this.props?.config?.useTranslations ?? false,
				isHidden: this.props?.config?.isHidden,
				isDisabled: this.props?.config?.isDisabled,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"user">;
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
						type: props.db.getDataType("integer"),
						nullable: true,
						foreignKey: {
							table: "lucid_users",
							column: "id",
							onDelete: "set null",
						},
					},
				],
			},
			error: undefined,
		};
	}
	responseValueFormat(props: {
		data: FieldProp;
		formatMeta: FieldFormatMetaOld;
	}) {
		return {
			value: props.data.user_id ?? null,
			meta: {
				email: props.data?.user_email ?? null,
				username: props.data?.user_username ?? null,
				firstName: props.data?.user_first_name ?? null,
				lastName: props.data?.user_last_name ?? null,
			},
		} satisfies CFResponse<"user">;
	}
	formatResponseValue(value?: number | null) {
		return (value ?? null) satisfies CFResponse<"user">["value"];
	}
	formatResponseMeta(
		value: UserPropT | undefined | null,
		meta: FieldFormatMeta,
	) {
		if (value === null || value === undefined) return null;
		return {
			email: value?.email ?? null,
			username: value?.username ?? null,
			firstName: value?.first_name ?? null,
			lastName: value?.last_name ?? null,
		} satisfies CFResponse<"user">["meta"];
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
			jsonValue: null,
			mediaId: null,
			userId: props.item.value,
		} satisfies CFInsertItem<"user">;
	}
	cfSpecificValidation(value: unknown, relationData?: UserReferenceData[]) {
		const valueSchema = z.number();

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		const findUser = relationData?.find((u) => u.id === value);

		if (findUser === undefined) {
			return {
				valid: false,
				message: T("field_user_not_found"),
			};
		}

		return { valid: true };
	}
}

export default UserCustomField;
