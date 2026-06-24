import type { CustomFieldInputGenerateResponse } from "@lucidcms/types";
import constants from "../../../constants/constants.js";
import { copy } from "../../../libs/i18n/index.js";
import logger from "../../../libs/logger/index.js";
import type { CustomFieldInputV1Request } from "../../../libs/lucid-remote/services/generate-cms-ai.js";
import { generateCmsAi } from "../../../libs/lucid-remote/services/index.js";
import {
	getCmsAiGenerateFailedMessage,
	isCmsAiGenerateAcceptedData,
	isCmsAiGenerateCompletedData,
	isCmsAiGenerateFailedData,
} from "../../../libs/lucid-remote/utils.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import type { CustomFieldAiContextItem } from "../../../types.js";
import { tenantAccessAllowed } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getLicenseKey from "../../options/get-license-key.js";
import checkFeatureEnabled from "../checks/check-feature-enabled.js";
import formatCustomFieldDocumentContext, {
	formatCustomFieldCollectionDefinition,
	getTranslatedBrickDetails,
} from "../helpers/format-custom-field-document-context.js";
import formatCustomFieldOutput from "../helpers/format-custom-field-output.js";
import getTranslatedCollectionDetails from "../helpers/get-translated-collection-details.js";
import getTranslatedFieldDetails from "../helpers/get-translated-field-details.js";
import normalizeCustomFieldGenerationLocale from "../helpers/normalize-custom-field-generation-locale.js";
import storeFailedGeneration from "../storage/store-failed-generation.js";
import storeGeneration from "../storage/store-generation.js";

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
	const featureEnabledRes = await checkFeatureEnabled(context, {
		feature: "customFieldGeneration",
	});
	if (featureEnabledRes.error) return featureEnabledRes;

	const requestStartedAt = Date.now();
	const licenseKeyRes = await getLicenseKey(context);
	if (licenseKeyRes.error) return licenseKeyRes;

	const collection = context.config.collections.find(
		(item) => item.key === props.target.collectionKey,
	);
	if (
		!collection ||
		!tenantAccessAllowed(collection.getData.tenants, context.request.tenantKey)
	) {
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
	if (
		props.target.brickKey &&
		(!targetBrick ||
			!tenantAccessAllowed(
				targetBrick.config.tenants,
				context.request.tenantKey,
			))
	) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.ai.custom.field.input.target.not.found"),
			},
			data: undefined,
		};
	}

	const fieldSource = targetBrick ?? collection;

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
		collection.getData.features.localized === true &&
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
				context,
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
	const responseData = generateRes.data.json.data;

	//* This feature is sync-mode only; this guard is proofing against a remote contract mismatch and should never run.
	const responseDataFailed = isCmsAiGenerateFailedData(responseData);
	if (isCmsAiGenerateAcceptedData(responseData) || responseDataFailed) {
		const errorMessage = responseDataFailed
			? getCmsAiGenerateFailedMessage(
					responseData,
					context.translate("server:core.routes.ai.generate.error.message"),
				)
			: context.translate("server:core.routes.ai.generate.error.message");

		const storeRes = await storeFailedGeneration(context, {
			userId: props.userId,
			requestId: responseData.requestId,
			feature: responseData.feature,
			targetType: "custom-field",
			target: {
				collectionKey: props.target.collectionKey,
				brickKey: props.target.brickKey,
				fieldKey: props.target.fieldKey,
				guidance: props.guidance ?? null,
				locale: props.locale,
			},
			requestStartedAt,
			errorMessage,
			usage: responseDataFailed ? responseData.usage : undefined,
		});
		if (storeRes.error) return storeRes;

		return {
			error: {
				type: "basic",
				status: 502,
				message: responseDataFailed
					? copy.literal(errorMessage)
					: copy("server:core.routes.ai.generate.error.message"),
			},
			data: undefined,
		};
	}

	if (!isCmsAiGenerateCompletedData(responseData)) {
		return {
			error: {
				type: "basic",
				status: 502,
				message: copy("server:core.routes.ai.generate.error.message"),
			},
			data: undefined,
		};
	}
	const responseForFormatting =
		responseData as CustomFieldInputGenerateResponse;

	const formattedOutputRes = formatCustomFieldOutput({
		field: targetField,
		output: responseForFormatting.output,
	});

	const responseForStorage: CustomFieldInputGenerateResponse =
		formattedOutputRes.error === undefined
			? {
					...responseForFormatting,
					output: formattedOutputRes.data,
				}
			: responseForFormatting;
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
