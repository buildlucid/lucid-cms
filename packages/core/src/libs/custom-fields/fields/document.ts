import T from "../../../translations/index.js";
import z from "zod";
import CustomField from "../custom-field.js";
import keyToTitle from "../utils/key-to-title.js";
import zodSafeParse from "../utils/zod-safe-parse.js";
import Formatter from "../../formatters/index.js";
import buildTableName from "../../../services/collection-migrator/helpers/build-table-name.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	CFInsertItem,
	DocumentReferenceData,
	GetSchemaDefinitionProps,
	SchemaDefinition,
	DocumentResValue,
} from "../types.js";
import type {
	FieldProp,
	FieldFormatMeta as FieldFormatMetaOld,
} from "../../formatters/collection-document-fields.js";
import type { FieldFormatMeta } from "../../formatters/document-fields.js";
import type { FieldInsertItem } from "../../../services/collection-document-bricks/helpers/flatten-fields.js";
import type { ServiceResponse } from "../../../types.js";
import type { DocumentPropsT } from "../../formatters/documents.js";
import type { BrickQueryResponse } from "../../repositories/document-bricks.js";

const FieldsFormatter = Formatter.get("collection-document-fields");

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
	responseValueFormat(props: {
		data: FieldProp;
		formatMeta: FieldFormatMetaOld;
	}) {
		const CollectionBuilder = props.formatMeta.collections.find(
			(c) => c.key === this.props.collection,
		);
		if (!CollectionBuilder) {
			return {
				value: props.data?.document_id ?? null,
				meta: {
					id: props.data.document_id ?? null,
					fields: null,
				},
			};
		}

		const documentFields = FieldsFormatter.objectifyFields(
			FieldsFormatter.formatMultiple(
				{
					fields: props.data.document_fields || [],
					groups: props.data.document_groups || [],
				},
				{
					builder: CollectionBuilder,
					collectionTranslations:
						CollectionBuilder.getData.config.useTranslations,
					localisation: props.formatMeta.localisation,
					collections: props.formatMeta.collections,
					host: props.formatMeta.host,
				},
			),
		);

		return {
			value: props.data?.document_id ?? null,
			meta: {
				id: props.data.document_id ?? null,
				fields: Object.keys(documentFields).length > 0 ? documentFields : null,
			},
		} satisfies CFResponse<"document">;
	}
	formatResponseValue(value?: number | null) {
		return (value ?? null) satisfies CFResponse<"document">["value"];
	}
	formatResponseMeta(
		value: BrickQueryResponse | undefined,
		meta: FieldFormatMeta,
	) {
		// TODO: come back to finish the fields formatting
		return {
			id: value?.id ?? null,
			collectionKey: value?.collection_key ?? null,
			fields: null,
		} satisfies CFResponse<"document">["meta"];
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
			documentId: props.item.value,
			userId: null,
		} satisfies CFInsertItem<"document">;
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
}

export default DocumentCustomField;
