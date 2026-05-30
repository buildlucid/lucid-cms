import constants from "../../constants/constants.js";
import { coreAiGuidance } from "../../constants/default-config.js";
import { copy } from "../../libs/i18n/index.js";
import logger from "../../libs/logger/index.js";
import type {
	CmsAiGenerateData,
	CustomFieldInputV1Request,
} from "../../libs/lucid-remote/services/generate-cms-ai.js";
import { generateCmsAi } from "../../libs/lucid-remote/services/index.js";
import type { CustomFieldAiContextItem } from "../../types.js";
import type { ServiceContext, ServiceFn } from "../../utils/services/types.js";
import getLicenseKey from "../options/get-license-key.js";
import normalizeCurrentValueTranslations from "./helpers/normalize-current-value-translations.js";

const getTranslatedFieldDetails = (
	context: ServiceContext,
	targetField: {
		details: {
			label?: Parameters<ServiceContext["translate"]>[0];
			summary?: Parameters<ServiceContext["translate"]>[0];
		};
	},
) => {
	const translate = context.translate.forLocale(
		context.config.i18n.defaultLocale,
	);
	const label = translate(targetField.details.label);
	const summary = translate(targetField.details.summary);

	if (!label && !summary) return undefined;

	return {
		...(label ? { label } : {}),
		...(summary ? { summary } : {}),
	};
};

const customFieldInput: ServiceFn<
	[
		{
			instruction: string;
			guidance?: string;
			currentValue?: unknown;
			target: {
				collectionKey: string;
				brickKey?: string;
				fieldKey: string;
			};
			locale: {
				source?: string;
				target: string[];
			};
		},
	],
	CmsAiGenerateData
> = async (context, props) => {
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

	const input: CustomFieldInputV1Request["input"] = [
		{
			type: "text",
			role: "user-instruction",
			value: props.instruction,
		},
	];
	if (targetField.aiConfig.instructions?.trim()) {
		input.push({
			type: "text",
			role: "field-instructions",
			value: targetField.aiConfig.instructions,
		});
	}
	if (props.guidance) {
		const allowedGuidanceKeys =
			targetField.aiConfig.guidance ?? coreAiGuidance.map((item) => item.key);
		const guidance = context.config.ai.guidance.find((item) => {
			if (item.key !== props.guidance) return false;

			return allowedGuidanceKeys.includes(item.key);
		});
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
				locale: props.locale,
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

	const targetLocale = props.locale.target.at(0);
	if (!targetLocale) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.routes.ai.generate.error.message"),
			},
			data: undefined,
		};
	}

	const currentValueTranslations = normalizeCurrentValueTranslations({
		currentValue: props.currentValue,
		localeCodes: [
			...context.config.localization.locales.map((locale) => locale.code),
			...(props.locale.source ? [props.locale.source] : []),
			...props.locale.target,
		],
		targetLocale,
	});

	const request: CustomFieldInputV1Request = {
		feature: {
			key: "custom-field.input.generate",
			version: "v1",
		},
		input,
		context: {
			locale: props.locale,
			collection: {
				key: props.target.collectionKey,
			},
			field: {
				key: targetField.key,
				type: targetField.type,
				details: getTranslatedFieldDetails(context, targetField),
				translations: currentValueTranslations,
				valueSchema: targetField.jsonSchema,
			},
			items: contextItems,
		},
	};

	const generateRes = await generateCmsAi(context, {
		licenseKey: licenseKeyRes.data,
		request,
	});
	if (generateRes.error) return generateRes;

	return {
		error: undefined,
		data: generateRes.data.json.data,
	};
};

export default customFieldInput;
