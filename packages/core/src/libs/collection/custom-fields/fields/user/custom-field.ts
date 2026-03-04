import z from "zod";
import T from "../../../../../translations/index.js";
import type { ServiceResponse } from "../../../../../types.js";
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
import { userFieldConfig } from "./config.js";
import type { UserValidationData } from "./types.js";

class UserCustomField extends CustomField<"user"> {
	type = userFieldConfig.type;
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
	uniqueValidation(value: unknown, refData?: UserValidationData[]) {
		const valueSchema = z.number();

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		const findUser = refData?.find((u) => u.id === value);

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
