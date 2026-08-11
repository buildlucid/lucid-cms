import type { RichTextReference } from "@lucidcms/rich-text";
import { copy } from "../../../../../i18n/index.js";
import { isFieldTypeRichTextVariable } from "../../../capabilities.js";
import type { CustomFieldValidationError } from "../../../types.js";
import type { RichTextFieldConfig, RichTextValidationData } from "../types.js";
import {
	collectionIsAllowed,
	isReferenceId,
	isRichTextUserVariableField,
} from "./reference-validation.js";

type VariableReference = Extract<
	RichTextReference,
	{ type: "rich-text-variable" }
>;

type VariableValidationResult = {
	key: string;
	error: CustomFieldValidationError;
};

/** Validates a document- or user-backed variable and builds its reference error. */
const validateRichTextVariableReference = (props: {
	reference: VariableReference;
	variables: NonNullable<RichTextFieldConfig["editor"]>["variables"];
	validationData: RichTextValidationData;
}): VariableValidationResult | null => {
	const { reference, variables, validationData } = props;

	if (reference.source === "document") {
		if (
			typeof reference.collectionKey !== "string" ||
			!isReferenceId(reference.documentId) ||
			typeof reference.fieldKey !== "string" ||
			reference.fieldKey.length === 0
		) {
			return {
				key: "variable:document:invalid",
				error: {
					message: copy("server:core.fields.rich.text.reference.invalid"),
				},
			};
		}

		const key = `variable:document:${reference.collectionKey}:${reference.documentId}:${reference.fieldKey}`;
		const meta = {
			reference: {
				type: "rich-text-variable" as const,
				source: "document" as const,
				collectionKey: reference.collectionKey,
				documentId: reference.documentId,
				fieldKey: reference.fieldKey,
			},
		};

		if (!collectionIsAllowed(variables?.document, reference.collectionKey)) {
			return {
				key,
				error: {
					message: copy("server:core.fields.rich.text.variable.not.allowed"),
					meta,
				},
			};
		}

		if (
			validationData.variableAccess &&
			!validationData.variableAccess.documentCollectionKeys.includes(
				reference.collectionKey,
			)
		) {
			return {
				key,
				error: {
					message: copy(
						"server:core.fields.rich.text.variable.permission.denied",
					),
					meta,
				},
			};
		}

		const document = validationData.documents.find(
			(item) =>
				item.id === reference.documentId &&
				item.collection_key === reference.collectionKey,
		);
		if (!document) {
			return {
				key,
				error: {
					message: copy("server:core.fields.relation.validation.not.found"),
					meta,
				},
			};
		}

		const field = validationData.collections[
			reference.collectionKey
		]?.fields.find((item) => item.key === reference.fieldKey);
		if (
			!field ||
			!isFieldTypeRichTextVariable(field.type) ||
			field.treeParent !== null ||
			field.structuralParent !== null
		) {
			return {
				key,
				error: {
					message: copy(
						"server:core.fields.rich.text.variable.field.not.found",
					),
					meta,
				},
			};
		}

		return null;
	}

	if (reference.source === "user") {
		if (
			!isReferenceId(reference.userId) ||
			!isRichTextUserVariableField(reference.fieldKey)
		) {
			return {
				key: "variable:user:invalid",
				error: {
					message: copy("server:core.fields.rich.text.reference.invalid"),
				},
			};
		}

		const key = `variable:user:${reference.userId}:${reference.fieldKey}`;
		const meta = {
			reference: {
				type: "rich-text-variable" as const,
				source: "user" as const,
				userId: reference.userId,
				fieldKey: reference.fieldKey,
			},
		};

		if (variables?.user?.includes(reference.fieldKey) !== true) {
			return {
				key,
				error: {
					message: copy("server:core.fields.rich.text.variable.not.allowed"),
					meta,
				},
			};
		}

		if (validationData.variableAccess?.users === false) {
			return {
				key,
				error: {
					message: copy(
						"server:core.fields.rich.text.variable.permission.denied",
					),
					meta,
				},
			};
		}

		if (!validationData.users.some((user) => user.id === reference.userId)) {
			return {
				key,
				error: {
					message: copy("server:core.fields.user.validation.not.found"),
					meta,
				},
			};
		}

		return null;
	}

	return {
		key: "variable:invalid",
		error: {
			message: copy("server:core.fields.rich.text.reference.invalid"),
		},
	};
};

export default validateRichTextVariableReference;
