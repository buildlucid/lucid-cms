import z from "zod";
import T from "../../../../../translations/index.js";
import type { ServiceResponse } from "../../../../../types.js";
import buildTableName from "../../../helpers/build-table-name.js";
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
import { documentFieldConfig } from "./config.js";
import type { DocumentValidationData } from "./types.js";

class DocumentCustomField extends CustomField<"document"> {
	type = documentFieldConfig.type;
	column = "document_id" as const;
	config;
	key;
	props;
	constructor(key: string, props: CFProps<"document">) {
		super();
		this.key = key;
		this.props = props;
		this.config = {
			key: this.key,
			type: this.type,
			collection: this.props.collection,
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
		} satisfies CFConfig<"document">;
	}
	// Methods
	getSchemaDefinition(
		props: GetSchemaDefinitionProps,
	): Awaited<ServiceResponse<SchemaDefinition>> {
		const documentTableRes = buildTableName(
			"document",
			{
				collection: this.config.collection,
			},
			props.db.config.tableNameByteLimit,
		);
		if (documentTableRes.error) return documentTableRes;

		return {
			data: {
				columns: [
					{
						name: this.config.key,
						type: props.db.getDataType("integer"),
						nullable: true,
						foreignKey: {
							table: documentTableRes.data.name,
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
		return (value ?? null) satisfies CFResponse<"document">["value"];
	}
	uniqueValidation(value: unknown, refData?: DocumentValidationData[]) {
		const valueSchema = z.number();

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		const findDocument = refData?.find(
			(d) => d.id === value && d.collection_key === this.config.collection,
		);

		if (findDocument === undefined) {
			return {
				valid: false,
				message: T("field_document_not_found"),
			};
		}

		return { valid: true };
	}
}

export default DocumentCustomField;
