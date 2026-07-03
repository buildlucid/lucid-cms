import z from "zod";
import type {
	LucidBricksTable,
	Select,
	ServiceResponse,
} from "../../../../../types.js";
import { copy } from "../../../../i18n/index.js";
import buildSchemaIndex from "../../../helpers/build-schema-index.js";
import buildTableName from "../../../helpers/build-table-name.js";
import prefixGeneratedColName from "../../../helpers/prefix-generated-column-name.js";
import CustomField from "../../custom-field.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	CustomFieldErrorItem,
	CustomFieldValidationError,
	FieldRelationRefTarget,
	FieldRelationValidationInput,
	GetIndexDefinitionProps,
	GetSchemaDefinitionProps,
	IndexDefinition,
	SchemaDefinition,
} from "../../types.js";
import keyToTitle from "../../utils/key-to-title.js";
import { validateRelationItemCount } from "../../utils/relation-item-count-validation.js";
import zodSafeParse from "../../utils/zod-safe-parse.js";
import { documentFieldConfig } from "./config.js";
import type { DocumentFieldValue, DocumentValidationData } from "./types.js";
import {
	clampDocumentFieldInput,
	normalizeStoredDocumentFieldValues,
} from "./utils/document-field-values.js";
import { normalizeDocumentCollections } from "./utils/normalize-document-collections.js";

class DocumentCustomField extends CustomField<"document"> {
	type = documentFieldConfig.type;
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
			collection: normalizeDocumentCollections(this.props.collection),
			details: {
				label:
					this.props?.details?.label ??
					copy(`admin:fields.${this.type}.${this.key}.label`, {
						defaultMessage: keyToTitle(this.key),
					}),
				summary: this.props?.details?.summary,
			},
			localized: this.props?.localized ?? false,
			default: this.props?.default ?? [],
			index: this.props?.index,
			multiple: this.props?.multiple,
			ui: {
				hidden: this.props?.ui?.hidden,
				disabled: this.props?.ui?.disabled,
				condition: this.props?.ui?.condition,
				width: this.props?.ui?.width,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"document">;
	}
	override normalizeInputValue(value: unknown) {
		return clampDocumentFieldInput(value, this.config.multiple);
	}
	override get defaultValue(): unknown {
		return normalizeStoredDocumentFieldValues(
			this.config.default,
			this.config.multiple,
		);
	}
	override get errors(): {
		fieldType: CustomFieldErrorItem;
		required: CustomFieldErrorItem;
		zod: CustomFieldErrorItem;
	} {
		return {
			...super.errors,
			required: {
				condition: (value: unknown) =>
					value === undefined ||
					value === null ||
					(Array.isArray(value) && value.length === 0),
				message: copy("server:core.fields.validation.required"),
			},
		};
	}
	getSchemaDefinition(
		props: GetSchemaDefinitionProps,
	): Awaited<ServiceResponse<SchemaDefinition>> {
		return {
			data: {
				columns: [
					{
						name: "collection_key",
						type: props.db.getDataType("text"),
						nullable: false,
					},
					{
						name: "document_id",
						type: props.db.getDataType("integer"),
						nullable: false,
					},
				],
			},
			error: undefined,
		};
	}
	override getIndexDefinitions(
		props: GetIndexDefinitionProps,
	): IndexDefinition[] {
		const columns = [
			prefixGeneratedColName("collection_key"),
			prefixGeneratedColName("document_id"),
		];

		return [
			buildSchemaIndex({
				db: props.db,
				tableName: props.table.name,
				columns,
				source: "field",
			}),
		];
	}
	formatResponseValue(value: unknown) {
		return normalizeStoredDocumentFieldValues(
			value,
			this.config.multiple,
		) satisfies CFResponse<"document">["value"];
	}
	override serializeRelationFieldValue(
		value: unknown,
	): Array<Record<string, unknown>> {
		return normalizeStoredDocumentFieldValues(value, this.config.multiple).map(
			(documentValue) => ({
				[prefixGeneratedColName("collection_key")]: documentValue.collectionKey,
				[prefixGeneratedColName("document_id")]: documentValue.id,
			}),
		);
	}
	override extractRelationFieldValue(
		row: Select<LucidBricksTable>,
	): DocumentFieldValue | null {
		const documentId = row[prefixGeneratedColName("document_id")];
		const collectionKey = row[prefixGeneratedColName("collection_key")];

		if (typeof documentId !== "number") return null;
		if (typeof collectionKey !== "string") return null;

		return {
			id: documentId,
			collectionKey: collectionKey,
		};
	}
	override getRelationFieldValidationInput(
		value: unknown,
	): FieldRelationValidationInput {
		return normalizeStoredDocumentFieldValues(
			value,
			this.config.multiple,
		).reduce<Record<string, number[]>>((acc, item) => {
			if (!acc[item.collectionKey]) {
				acc[item.collectionKey] = [];
			}

			acc[item.collectionKey]?.push(item.id);
			return acc;
		}, {});
	}
	override getRelationFieldRefTargets(
		row: Select<LucidBricksTable>,
	): FieldRelationRefTarget[] {
		const relationValue = this.extractRelationFieldValue(row);
		if (!relationValue) return [];

		const tableNameRes = buildTableName(
			"document",
			{
				collection: relationValue.collectionKey,
			},
			null,
		);
		if (tableNameRes.error) return [];

		return [
			{
				table: tableNameRes.data.name,
				value: relationValue.id,
			},
		];
	}
	uniqueValidation(value: unknown, refData?: DocumentValidationData[]) {
		const valueSchema = z.array(
			z.object({
				id: z.number(),
				collectionKey: z.string(),
			}),
		);
		const candidateValue = clampDocumentFieldInput(value, this.config.multiple);
		const valueValidate = zodSafeParse(candidateValue, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		const normalizedValue = normalizeStoredDocumentFieldValues(
			candidateValue,
			this.config.multiple,
		);
		const itemCountValidation = validateRelationItemCount({
			multiple: this.config.multiple,
			length: normalizedValue.length,
			validation: this.config.validation,
		});
		if (!itemCountValidation.valid) return itemCountValidation;
		const allowedCollections = normalizeDocumentCollections(
			this.config.collection,
		);
		const errors: CustomFieldValidationError[] = [];

		for (const [itemIndex, documentValue] of normalizedValue.entries()) {
			if (!allowedCollections.includes(documentValue.collectionKey)) {
				errors.push({
					itemIndex,
					message: copy("server:core.fields.document.validation.not.found"),
				});
				continue;
			}

			const findDocument = refData?.find(
				(d) =>
					d.id === documentValue.id &&
					d.collection_key === documentValue.collectionKey,
			);

			if (findDocument === undefined) {
				errors.push({
					itemIndex,
					message: copy("server:core.fields.document.validation.not.found"),
				});
			}
		}

		if (errors.length > 0) {
			return {
				valid: false,
				errors,
			};
		}

		return { valid: true };
	}
}

export default DocumentCustomField;
