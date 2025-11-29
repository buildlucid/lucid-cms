import T from "../../../translations/index.js";
import z from "zod/v4";
import CustomField from "../custom-field.js";
import keyToTitle from "../utils/key-to-title.js";
import zodSafeParse from "../utils/zod-safe-parse.js";
import buildTableName from "../../collection/helpers/build-table-name.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	DocumentReferenceData,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../types.js";
import type { ServiceResponse } from "../../../types.js";
import type { BrickQueryResponse } from "../../repositories/document-bricks.js";
import {
	documentFieldsFormatter,
	documentBricksFormatter,
} from "../../formatters/index.js";
import type { FieldRefParams } from "../types.js";

class DocumentCustomField extends CustomField<"document"> {
	type = "document" as const;
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
		const documentTableRes = buildTableName("document", {
			collection: this.config.collection,
		});
		if (documentTableRes.error) return documentTableRes;

		return {
			data: {
				columns: [
					{
						name: this.key,
						type: props.db.getDataType("integer"),
						nullable: true,
						foreignKey: {
							table: documentTableRes.data,
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
	static formatRef(
		value: BrickQueryResponse | undefined | null,
		params: FieldRefParams,
	) {
		if (value === null || value === undefined) return null;

		const collection = params.config.collections.find(
			(c) => c.key === params.collection.key,
		);
		if (!collection || !value) {
			return {
				id: value.document_id,
				collectionKey: value.collection_key,
				fields: null,
			};
		}

		const documentFields = documentFieldsFormatter.objectifyFields(
			documentBricksFormatter.formatDocumentFields({
				bricksQuery: value,
				bricksSchema: params.bricksTableSchema,
				relationMetaData: {},
				collection: collection,
				config: params.config,
			}),
		);

		return {
			id: value.id,
			collectionKey: value.collection_key,
			fields: Object.keys(documentFields).length > 0 ? documentFields : null,
		} satisfies CFResponse<"document">["ref"];
	}
	cfSpecificValidation(value: unknown, relationData?: DocumentReferenceData[]) {
		const valueSchema = z.number();

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		const findDocument = relationData?.find(
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
	get translationsEnabled() {
		return this.config.config.useTranslations;
	}
	get defaultValue() {
		return null;
	}
}

export default DocumentCustomField;
