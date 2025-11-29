import T from "../../../translations/index.js";
import z from "zod/v4";
import CustomField from "../custom-field.js";
import keyToTitle from "../utils/key-to-title.js";
import zodSafeParse from "../utils/zod-safe-parse.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	UserReferenceData,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../types.js";
import type { ServiceResponse } from "../../../types.js";
import type { UserPropT } from "../../formatters/users.js";

class UserCustomField extends CustomField<"user"> {
	type = "user" as const;
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
	formatResponseValue(value?: number | null) {
		return (value ?? null) satisfies CFResponse<"user">["value"];
	}
	static formatRef(value: UserPropT | undefined | null) {
		if (value === null || value === undefined) return null;
		return {
			id: value.id ?? null,
			email: value.email,
			username: value.username,
			firstName: value.first_name,
			lastName: value.last_name,
		} satisfies CFResponse<"user">["ref"];
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
	get translationsEnabled() {
		return this.config.config.useTranslations;
	}
	get defaultValue() {
		return null;
	}
}

export default UserCustomField;
