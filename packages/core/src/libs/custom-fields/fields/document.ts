import T from "../../../translations/index.js";
import z from "zod";
import CustomField from "../custom-field.js";
import keyToTitle from "../utils/key-to-title.js";
import zodSafeParse from "../utils/zod-safe-parse.js";
import Formatter from "../../formatters/index.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	CFInsertItem,
	DocumentReferenceData,
} from "../types.js";
import type {
	FieldProp,
	FieldFormatMeta,
} from "../../formatters/collection-document-fields.js";
import type { FieldInsertItem } from "../../../services/collection-document-bricks/helpers/flatten-fields.js";
import type { Config } from "../../../exports/types.js";

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
			labels: {
				title: this.props?.labels?.title ?? keyToTitle(this.key),
				description: this.props?.labels?.description,
			},
			useTranslations: this.props?.useTranslations ?? false,
			hidden: this.props?.hidden,
			disabled: this.props?.disabled,
			validation: this.props?.validation,
		} satisfies CFConfig<"document">;
	}
	// Methods
	responseValueFormat(props: {
		data: FieldProp;
		formatMeta: FieldFormatMeta;
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

		const findDocument = relationData?.find((d) => d.id === value);

		if (findDocument === undefined) {
			return {
				valid: false,
				message: T("field_document_not_found"),
			};
		}

		if (findDocument.collection_key !== this.config.collection) {
			return {
				valid: false,
				message: T("field_document_collection_key_mismatch", {
					expected: this.config.collection,
					received: findDocument.collection_key,
				}),
			};
		}

		return { valid: true };
	}
}

export default DocumentCustomField;
