import {
	extractRichTextReferences,
	type RichTextJSON,
} from "@lucidcms/rich-text";
import z from "zod";
import type { ServiceResponse } from "../../../../../types.js";
import { getObject } from "../../../../../utils/helpers/get-typed-value.js";
import richTextHasContent from "../../../../../utils/helpers/rich-text-has-content.js";
import { copy } from "../../../../i18n/index.js";
import { defaultTextFieldAiGuidance } from "../../ai-guidance.js";
import { isFieldTypeRichTextVariable } from "../../capabilities.js";
import CustomField from "../../custom-field.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	CustomFieldAiFormatResponse,
	CustomFieldErrorItem,
	CustomFieldResponseFormatContext,
	CustomFieldValidationError,
	FieldRelationValidationInput,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../../types.js";
import keyToTitle from "../../utils/key-to-title.js";
import zodSafeParse from "../../utils/zod-safe-parse.js";
import { richTextFieldConfig } from "./config.js";
import type { RichTextValidationData } from "./types.js";
import extractRichTextRefTargets from "./utils/extract-ref-targets.js";
import hydrateRichTextValue from "./utils/hydrate-value.js";
import normalizeRichTextValue from "./utils/normalize-value.js";
import {
	collectionIsAllowed,
	isReferenceId,
} from "./utils/reference-validation.js";
import {
	richTextDocumentValidationGroupPrefix,
	richTextMediaValidationGroup,
} from "./validate-input.js";

class RichTextCustomField extends CustomField<"rich-text"> {
	type = richTextFieldConfig.type;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"rich-text">) {
		super();
		this.key = key;
		this.props = props;
		this.config = {
			key: this.key,
			type: this.type,
			details: {
				label:
					this.props?.details?.label ??
					copy(`admin:fields.${this.type}.${this.key}.label`, {
						defaultMessage: keyToTitle(this.key),
					}),
				summary: this.props?.details?.summary,
				placeholder: this.props?.details?.placeholder,
			},
			ai: this.props?.ai,
			localized: this.props?.localized ?? true,
			default: this.props?.default ?? {
				type: "doc",
				content: [{ type: "paragraph" }],
			},
			index: this.props?.index,
			editor: this.props?.editor,
			ui: {
				hidden: this.props?.ui?.hidden,
				disabled: this.props?.ui?.disabled,
				condition: this.props?.ui?.condition,
				width: this.props?.ui?.width,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"rich-text">;
	}
	override get supportsAi() {
		return true;
	}
	protected override get defaultAiGuidance() {
		return defaultTextFieldAiGuidance;
	}
	override get errors(): {
		fieldType: CustomFieldErrorItem;
		required: CustomFieldErrorItem;
		zod: CustomFieldErrorItem;
	} {
		const errors = super.errors;

		return {
			...errors,
			required: {
				condition: (value: unknown) =>
					errors.required.condition?.(value) === true ||
					(getObject(value) !== null && !richTextHasContent(value)),
				message: errors.required.message,
			},
		};
	}
	override get jsonSchema() {
		const textNodeSchema = {
			type: "object",
			additionalProperties: false,
			required: ["type", "text"],
			properties: {
				type: {
					type: "string",
					const: "text",
				},
				text: {
					type: "string",
				},
			},
		};
		const paragraphNodeSchema = {
			type: "object",
			additionalProperties: false,
			required: ["type", "content"],
			properties: {
				type: {
					type: "string",
					const: "paragraph",
				},
				content: {
					type: "array",
					items: textNodeSchema,
				},
			},
		};

		return {
			type: "object",
			additionalProperties: false,
			required: ["type", "content"],
			properties: {
				type: {
					type: "string",
					const: "doc",
				},
				content: {
					type: "array",
					items: paragraphNodeSchema,
				},
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
						name: this.key,
						type: props.db.getDataType("json"),
						nullable: true,
						default: this.config.default,
					},
				],
			},
			error: undefined,
		};
	}
	formatResponseValue(
		value?: Record<string, unknown> | null,
		context?: CustomFieldResponseFormatContext,
	) {
		const responseValue = (value ??
			this.config.default ??
			null) satisfies CFResponse<"rich-text">["value"];
		if (!responseValue || !context) return responseValue;

		return hydrateRichTextValue(responseValue, context);
	}
	override normalizeInputValue(value: unknown) {
		if (!value || typeof value !== "object" || Array.isArray(value)) {
			return value;
		}

		return normalizeRichTextValue(value);
	}
	override getFieldRefTargets(value: unknown) {
		return extractRichTextRefTargets(value);
	}
	override getRelationFieldValidationInput(
		value: unknown,
	): FieldRelationValidationInput {
		if (!value || typeof value !== "object" || Array.isArray(value)) return {};

		const input: FieldRelationValidationInput = {};
		for (const reference of extractRichTextReferences(value as RichTextJSON)) {
			if (
				reference.type === "rich-text-media" &&
				isReferenceId(reference.mediaId)
			) {
				input[richTextMediaValidationGroup] ??= [];
				input[richTextMediaValidationGroup]?.push(reference.mediaId);
			}
			if (
				(reference.type === "rich-text-document" ||
					reference.type === "rich-text-variable" ||
					reference.type === "rich-text-document-link") &&
				typeof reference.collectionKey === "string" &&
				isReferenceId(reference.documentId)
			) {
				const group = `${richTextDocumentValidationGroupPrefix}${reference.collectionKey}`;
				input[group] ??= [];
				input[group]?.push(reference.documentId);
			}
		}
		return input;
	}
	override formatAiGeneratedValue(value: unknown): CustomFieldAiFormatResponse {
		if (value && typeof value === "object" && !Array.isArray(value)) {
			return {
				success: true,
				value,
			};
		}

		return {
			success: false,
			message: copy("server:core.routes.ai.generate.error.message"),
		};
	}
	uniqueValidation(value: unknown, refData?: RichTextValidationData) {
		const valueSchema = z.record(
			z.union([z.string(), z.number(), z.symbol()]),
			z.unknown(),
		);

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;
		if (!refData) return { valid: true };

		const errors: CustomFieldValidationError[] = [];
		const checkedReferences = new Set<string>();

		const addError = (key: string, error: CustomFieldValidationError) => {
			if (checkedReferences.has(key)) return;
			checkedReferences.add(key);
			errors.push(error);
		};

		for (const reference of extractRichTextReferences(value as RichTextJSON)) {
			if (reference.type === "rich-text-document") {
				if (
					typeof reference.collectionKey !== "string" ||
					!isReferenceId(reference.documentId)
				) {
					addError("document:invalid", {
						message: copy("server:core.fields.rich.text.reference.invalid"),
					});
					continue;
				}

				const key = `document:${reference.collectionKey}:${reference.documentId}`;
				const meta = {
					reference: {
						type: "rich-text-document" as const,
						collectionKey: reference.collectionKey,
						documentId: reference.documentId,
					},
				};
				if (
					!collectionIsAllowed(
						this.config.editor?.documents,
						reference.collectionKey,
					)
				) {
					addError(key, {
						message: copy("server:core.fields.rich.text.document.not.allowed"),
						meta,
					});
					continue;
				}

				if (
					!refData.documents.some(
						(item) =>
							item.id === reference.documentId &&
							item.collection_key === reference.collectionKey,
					)
				) {
					addError(key, {
						message: copy("server:core.fields.relation.validation.not.found"),
						meta,
					});
				}
				continue;
			}

			if (reference.type === "rich-text-media") {
				if (!isReferenceId(reference.mediaId)) {
					addError("media:invalid", {
						message: copy("server:core.fields.rich.text.reference.invalid"),
					});
					continue;
				}

				const media = refData.media.find(
					(item) => item.id === reference.mediaId,
				);
				if (!media) {
					addError(`media:${reference.mediaId}`, {
						message: copy("server:core.fields.media.validation.not.found"),
						meta: {
							reference: {
								type: "rich-text-media",
								mediaId: reference.mediaId,
							},
						},
					});
					continue;
				}

				const mediaConfig = this.config.editor?.media;
				if (
					mediaConfig !== true &&
					(!Array.isArray(mediaConfig) ||
						!mediaConfig.some((type) => type === media.type))
				) {
					addError(`media:${reference.mediaId}`, {
						message: copy("server:core.fields.rich.text.media.not.allowed"),
						meta: {
							reference: {
								type: "rich-text-media",
								mediaId: reference.mediaId,
							},
						},
					});
				}
				continue;
			}

			if (reference.type === "rich-text-variable") {
				if (
					typeof reference.collectionKey !== "string" ||
					!isReferenceId(reference.documentId) ||
					typeof reference.fieldKey !== "string" ||
					reference.fieldKey.length === 0
				) {
					addError("variable:invalid", {
						message: copy("server:core.fields.rich.text.reference.invalid"),
					});
					continue;
				}

				const key = `variable:${reference.collectionKey}:${reference.documentId}:${reference.fieldKey}`;
				const meta = {
					reference: {
						type: "rich-text-variable" as const,
						collectionKey: reference.collectionKey,
						documentId: reference.documentId,
						fieldKey: reference.fieldKey,
					},
				};
				if (
					!collectionIsAllowed(
						this.config.editor?.variables,
						reference.collectionKey,
					)
				) {
					addError(key, {
						message: copy("server:core.fields.rich.text.variable.not.allowed"),
						meta,
					});
					continue;
				}

				const document = refData.documents.find(
					(item) =>
						item.id === reference.documentId &&
						item.collection_key === reference.collectionKey,
				);
				if (!document) {
					addError(key, {
						message: copy("server:core.fields.relation.validation.not.found"),
						meta,
					});
					continue;
				}

				const field = refData.collections[reference.collectionKey]?.fields.find(
					(item) => item.key === reference.fieldKey,
				);
				if (
					!field ||
					!isFieldTypeRichTextVariable(field.type) ||
					field.treeParent !== null ||
					field.structuralParent !== null
				) {
					addError(key, {
						message: copy(
							"server:core.fields.rich.text.variable.field.not.found",
						),
						meta,
					});
				}
				continue;
			}

			if (reference.type === "rich-text-document-link") {
				if (
					typeof reference.collectionKey !== "string" ||
					!isReferenceId(reference.documentId)
				) {
					addError("document-link:invalid", {
						message: copy("server:core.fields.rich.text.reference.invalid"),
					});
					continue;
				}

				const key = `document-link:${reference.collectionKey}:${reference.documentId}`;
				const meta = {
					reference: {
						type: "rich-text-document-link" as const,
						collectionKey: reference.collectionKey,
						documentId: reference.documentId,
					},
				};
				if (
					!collectionIsAllowed(
						this.config.editor?.links?.internal,
						reference.collectionKey,
					)
				) {
					addError(key, {
						message: copy("server:core.fields.rich.text.link.not.allowed"),
						meta,
					});
					continue;
				}

				if (
					!refData.documents.some(
						(item) =>
							item.id === reference.documentId &&
							item.collection_key === reference.collectionKey,
					)
				) {
					addError(key, {
						message: copy("server:core.fields.relation.validation.not.found"),
						meta,
					});
				}
				continue;
			}

			if (typeof reference.ref !== "string" || reference.ref.length === 0) {
				addError("embedded-brick:invalid", {
					message: copy("server:core.fields.rich.text.reference.invalid"),
				});
				continue;
			}

			const key = `embedded-brick:${reference.ref}`;
			const meta = {
				reference: {
					type: "rich-text-embedded-brick" as const,
					ref: reference.ref,
				},
			};
			const brickKey = refData.embeddedBricks[reference.ref];
			if (!brickKey) {
				addError(key, {
					message: copy(
						"server:core.fields.rich.text.embedded.brick.not.found",
					),
					meta,
				});
				continue;
			}
			if (refData.cyclicEmbeddedBricks.includes(reference.ref)) {
				addError(key, {
					message: copy("server:core.fields.rich.text.embedded.brick.cyclic"),
					meta,
				});
				continue;
			}

			const brickConfig = this.config.editor?.bricks;
			if (
				brickConfig !== true &&
				(!Array.isArray(brickConfig) || !brickConfig.includes(brickKey))
			) {
				addError(key, {
					message: copy(
						"server:core.fields.rich.text.embedded.brick.not.allowed",
					),
					meta,
				});
			}
		}

		if (errors.length > 0) return { valid: false, errors };

		return { valid: true };
	}
}

export default RichTextCustomField;
