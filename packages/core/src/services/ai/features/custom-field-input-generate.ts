import type { CustomFieldInputGenerateResponse } from "@lucidcms/types";
import constants from "../../../constants/constants.js";
import { copy } from "../../../libs/i18n/index.js";
import logger from "../../../libs/logger/index.js";
import type { CustomFieldInputV1Request } from "../../../libs/lucid-remote/services/generate-cms-ai.js";
import { generateCmsAi } from "../../../libs/lucid-remote/services/index.js";
import { isCmsAiGenerateCompletedData } from "../../../libs/lucid-remote/utils.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import type { CustomFieldAiContextItem } from "../../../types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getLicenseKey from "../../options/get-license-key.js";
import formatCustomFieldDocumentContext, {
	formatCustomFieldCollectionDefinition,
	getTranslatedBrickDetails,
} from "../helpers/format-custom-field-document-context.js";
import formatCustomFieldOutput from "../helpers/format-custom-field-output.js";
import getTranslatedCollectionDetails from "../helpers/get-translated-collection-details.js";
import getTranslatedFieldDetails from "../helpers/get-translated-field-details.js";
import storeGeneration from "../storage/store-generation.js";

const normalizeCustomFieldGenerationLocale = (props: {
	defaultLocale: string;
	fieldIsLocalized: boolean;
	locale: {
		source?: string;
		target: string[];
	};
	value: Record<string, unknown>;
}) => {
	if (props.fieldIsLocalized) {
		return {
			locale: props.locale,
			value: props.value,
		};
	}

	if (Object.hasOwn(props.value, props.defaultLocale)) {
		return {
			locale: {
				source: props.defaultLocale,
				target: [props.defaultLocale],
			},
			value: {
				[props.defaultLocale]: props.value[props.defaultLocale],
			},
		};
	}

	const fallbackValue = Object.values(props.value)[0];

	return {
		locale: {
			source: props.defaultLocale,
			target: [props.defaultLocale],
		},
		value:
			fallbackValue === undefined
				? {}
				: {
						[props.defaultLocale]: fallbackValue,
					},
	};
};

const customFieldInputGenerate: ServiceFn<
	[
		{
			instruction?: string;
			guidance?: string;
			value: Record<string, unknown>;
			document?: {
				fields?: FieldInputSchema[];
				bricks?: BrickInputSchema[];
			};
			target: {
				collectionKey: string;
				brickKey?: string;
				fieldKey: string;
			};
			locale: {
				source?: string;
				target: string[];
			};
			userId: number;
		},
	],
	CustomFieldInputGenerateResponse
> = async (context, props) => {
	const requestStartedAt = Date.now();
	const licenseKeyRes = await getLicenseKey(context);
	if (licenseKeyRes.error) return licenseKeyRes;

	const collection = context.config.collections.find(
		(item) => item.key === props.target.collectionKey,
	);
	if (!collection) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.collections.not.found.message"),
			},
			data: undefined,
		};
	}

	const targetBrick = props.target.brickKey
		? collection.brickInstances.find(
				(brick) => brick.key === props.target.brickKey,
			)
		: undefined;
	const fieldSource = targetBrick ?? collection;

	if (props.target.brickKey && !targetBrick) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.ai.custom.field.input.target.not.found"),
			},
			data: undefined,
		};
	}

	const targetField = fieldSource.fields.get(props.target.fieldKey);

	if (!targetField) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.ai.custom.field.input.target.not.found"),
			},
			data: undefined,
		};
	}

	if (!targetField.aiConfig.enabled) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.ai.custom.field.input.no.supported.field"),
			},
			data: undefined,
		};
	}

	const fieldIsLocalized =
		collection.getData.config.localized === true &&
		targetField.localizedEnabled === true;
	const generationContext = normalizeCustomFieldGenerationLocale({
		defaultLocale: context.config.localization.defaultLocale,
		fieldIsLocalized,
		locale: props.locale,
		value: props.value,
	});

	const input: CustomFieldInputV1Request["input"] = [];
	if (props.instruction?.trim()) {
		input.push({
			type: "text",
			role: "user-instruction",
			value: props.instruction,
		});
	}
	if (targetField.aiConfig.instructions?.trim()) {
		input.push({
			type: "text",
			role: "field-instruction",
			value: targetField.aiConfig.instructions,
		});
	}
	if (props.guidance) {
		const guidance = targetField.aiConfig.guidance.find(
			(item) => item.key === props.guidance,
		);
		if (!guidance) {
			return {
				error: {
					type: "basic",
					status: 400,
					message: copy("server:core.ai.custom.field.input.guidance.not.found"),
				},
				data: undefined,
			};
		}

		input.push({
			type: "text",
			role: "guidance",
			value: guidance.instructions,
		});
	}

	let contextItems: CustomFieldAiContextItem[] = [];
	if (targetField.aiConfig.context) {
		try {
			contextItems = await targetField.aiConfig.context({
				collection,
				brick: targetBrick,
				field: targetField,
				locale: generationContext.locale,
			});
		} catch (err) {
			logger.error({
				scope: constants.logScopes.ai,
				message: "Failed to resolve AI field context",
				data: {
					errorMessage: err instanceof Error ? err.message : String(err),
				},
			});
		}
	}

	const collectionDetails = getTranslatedCollectionDetails(context, collection);
	const targetFieldDetails = getTranslatedFieldDetails(context, targetField);
	const targetBrickDetails = targetBrick
		? getTranslatedBrickDetails(context, targetBrick)
		: undefined;
	const collectionDefinition = formatCustomFieldCollectionDefinition({
		context,
		collection,
	});

	const request: CustomFieldInputV1Request = {
		feature: {
			key: "custom-field.input.generate",
			version: "v1",
		},
		input,
		outputSchema: targetField.jsonSchema,
		context: {
			locale: generationContext.locale,
			target: {
				collection: {
					key: props.target.collectionKey,
					...(collectionDetails ?? {}),
				},
				...(targetBrick
					? {
							brick: {
								key: targetBrick.key,
								...(targetBrickDetails ?? {}),
							},
						}
					: {}),
				field: {
					key: targetField.key,
					type: targetField.type,
					...(targetFieldDetails ?? {}),
					value: generationContext.value,
				},
			},
			collection: {
				key: props.target.collectionKey,
				...(collectionDetails ?? {}),
				...collectionDefinition,
			},
			items: contextItems,
			document: formatCustomFieldDocumentContext({
				collection,
				document: props.document,
			}),
		},
	};

	const generateRes = await generateCmsAi(context, {
		licenseKey: licenseKeyRes.data,
		request,
	});
	if (generateRes.error) return generateRes;

	//* This feature is sync-mode only; this guard is proofing against a remote contract mismatch and should never run.
	if (!isCmsAiGenerateCompletedData(generateRes.data.json.data)) {
		return {
			error: {
				type: "basic",
				status: 502,
				message: copy("server:core.routes.ai.generate.error.message"),
			},
			data: undefined,
		};
	}
	const responseData = generateRes.data.json
		.data as CustomFieldInputGenerateResponse;

	const formattedOutputRes = formatCustomFieldOutput({
		field: targetField,
		output: responseData.output,
	});

	const responseForStorage: CustomFieldInputGenerateResponse =
		formattedOutputRes.error === undefined
			? {
					...responseData,
					output: formattedOutputRes.data,
				}
			: responseData;
	const formattingErrorMessage =
		formattedOutputRes.error === undefined
			? null
			: context.translate(formattedOutputRes.error.message);

	const storeRes = await storeGeneration(context, {
		userId: props.userId,
		response: responseForStorage,
		targetType: "custom-field",
		requestStartedAt,
		status: formattedOutputRes.error === undefined ? "success" : "failed",
		errorMessage: formattingErrorMessage,
		target: {
			collectionKey: props.target.collectionKey,
			brickKey: props.target.brickKey,
			fieldKey: props.target.fieldKey,
			guidance: props.guidance ?? null,
			locale: props.locale,
		},
	});
	if (storeRes.error) return storeRes;
	if (formattedOutputRes.error) return formattedOutputRes;

	return {
		error: undefined,
		data: responseForStorage,
	};
};

export default customFieldInputGenerate;
