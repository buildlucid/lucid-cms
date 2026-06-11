import type { MediaAltGenerateResponse } from "@lucidcms/types";
import z from "zod";
import { copy } from "../../../libs/i18n/index.js";
import type { MediaAltGenerateV1Request } from "../../../libs/lucid-remote/services/generate-cms-ai.js";
import { generateCmsAi } from "../../../libs/lucid-remote/services/index.js";
import {
	getCmsAiGenerateFailedMessage,
	isCmsAiGenerateAcceptedData,
	isCmsAiGenerateCompletedData,
	isCmsAiGenerateFailedData,
} from "../../../libs/lucid-remote/utils.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getLicenseKey from "../../options/get-license-key.js";
import storeFailedGeneration from "../storage/store-failed-generation.js";
import storeGeneration from "../storage/store-generation.js";

const mediaAltOutputSchema = z.record(z.string(), z.string());

const mediaAltGenerate: ServiceFn<
	[
		{
			instruction?: string;
			previousResponses?: {
				instruction?: string;
				output: Record<string, string>;
			}[];
			image: {
				data: string;
				mimeType: "image/webp";
				detail: "low" | "high" | "auto";
				filename?: string;
			};
			media: {
				id?: string | number;
				name?: Record<string, string>;
				alt?: Record<string, string>;
			};
			locale: {
				source?: string;
				target: string[];
			};
			userId: number;
		},
	],
	MediaAltGenerateResponse
> = async (context, props) => {
	const requestStartedAt = Date.now();
	const licenseKeyRes = await getLicenseKey(context);
	if (licenseKeyRes.error) return licenseKeyRes;

	const input: MediaAltGenerateV1Request["input"] = [];

	if (props.instruction) {
		input.push({
			type: "text",
			role: "user-instruction",
			value: props.instruction,
		});
	}

	input.push({
		type: "image",
		role: "source-image",
		image: {
			type: "base64",
			data: props.image.data,
			mimeType: props.image.mimeType,
			detail: props.image.detail,
			filename: props.image.filename,
		},
	});

	const request: MediaAltGenerateV1Request = {
		feature: {
			key: "media.alt.generate",
			version: "v1",
		},
		input,
		context: {
			locale: props.locale,
			media: props.media,
			previousResponses: props.previousResponses,
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
			targetType: "media-alt",
			target: {
				mediaId: props.media.id ?? null,
				locale: props.locale,
				image: {
					detail: props.image.detail,
					filename: props.image.filename ?? null,
					mimeType: props.image.mimeType,
				},
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

	const outputParse = mediaAltOutputSchema.safeParse(responseData.output);
	if (!outputParse.success) {
		const storeRes = await storeGeneration(context, {
			userId: props.userId,
			response: responseData,
			targetType: "media-alt",
			requestStartedAt,
			status: "failed",
			errorMessage: context.translate(
				"server:core.routes.ai.generate.error.message",
			),
			target: {
				mediaId: props.media.id ?? null,
				locale: props.locale,
				image: {
					detail: props.image.detail,
					filename: props.image.filename ?? null,
					mimeType: props.image.mimeType,
				},
			},
		});
		if (storeRes.error) return storeRes;

		return {
			error: {
				type: "basic",
				status: 502,
				message: copy("server:core.routes.ai.generate.error.message"),
			},
			data: undefined,
		};
	}

	const missingLocale = props.locale.target.find(
		(locale) => outputParse.data[locale] === undefined,
	);
	if (missingLocale) {
		const storeRes = await storeGeneration(context, {
			userId: props.userId,
			response: responseData,
			targetType: "media-alt",
			requestStartedAt,
			status: "failed",
			errorMessage: context.translate(
				"server:core.routes.ai.generate.error.message",
			),
			target: {
				mediaId: props.media.id ?? null,
				locale: props.locale,
				image: {
					detail: props.image.detail,
					filename: props.image.filename ?? null,
					mimeType: props.image.mimeType,
				},
			},
		});
		if (storeRes.error) return storeRes;

		return {
			error: {
				type: "basic",
				status: 502,
				message: copy("server:core.routes.ai.generate.error.message"),
			},
			data: undefined,
		};
	}

	const storeRes = await storeGeneration(context, {
		userId: props.userId,
		response: responseData,
		targetType: "media-alt",
		requestStartedAt,
		target: {
			mediaId: props.media.id ?? null,
			locale: props.locale,
			image: {
				detail: props.image.detail,
				filename: props.image.filename ?? null,
				mimeType: props.image.mimeType,
			},
		},
	});
	if (storeRes.error) return storeRes;

	return {
		error: undefined,
		data: {
			mode: responseData.mode,
			requestId: responseData.requestId,
			feature: {
				key: "media.alt.generate",
				version: "v1",
			},
			output: outputParse.data,
			usage: responseData.usage,
		},
	};
};

export default mediaAltGenerate;
