import type {
	MediaImageGenerateCompletionPollResponse,
	MediaImageGenerateCompletionResponse,
} from "@lucidcms/types";
import z from "zod";
import { copy } from "../../../libs/i18n/index.js";
import { getCmsAiRequest } from "../../../libs/lucid-remote/services/index.js";
import {
	getCmsAiGenerateFailedMessage,
	isCmsAiGenerateAcceptedData,
	isCmsAiGenerateCompletedData,
	isCmsAiGenerateFailedData,
} from "../../../libs/lucid-remote/utils.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getLicenseKey from "../../options/get-license-key.js";
import completeStoredGeneration from "../storage/complete-stored-generation.js";
import storeFailedGeneration from "../storage/store-failed-generation.js";

const mediaImageOutputSchema = z
	.object({
		id: z.string(),
		url: z.string(),
		storageKey: z.string(),
		byteSize: z.number().int().nonnegative(),
		mimeType: z.string(),
		extension: z.string(),
		size: z.string(),
		quality: z.string(),
		outputFormat: z.string(),
	})
	.strict();

const mediaImageCompletion: ServiceFn<
	[
		{
			requestId: string;
		},
	],
	MediaImageGenerateCompletionPollResponse
> = async (context, props) => {
	const licenseKeyRes = await getLicenseKey(context);
	if (licenseKeyRes.error) return licenseKeyRes;

	const requestRes = await getCmsAiRequest(context, {
		licenseKey: licenseKeyRes.data,
		requestId: props.requestId,
	});
	if (requestRes.error) {
		if (
			requestRes.error.key?.startsWith("ai_provider_") ||
			requestRes.error.key === "cms_ai_generation_request_not_found" ||
			requestRes.error.key === "cms_ai_generated_image_not_found"
		) {
			const storeRes = await storeFailedGeneration(context, {
				requestId: props.requestId,
				errorMessage: context.translate(requestRes.error.message) ?? null,
			});
			if (storeRes.error) return storeRes;
		}

		return requestRes;
	}

	if (isCmsAiGenerateAcceptedData(requestRes.data.json.data)) {
		return {
			error: undefined,
			data: {
				mode: requestRes.data.json.data.mode,
				requestId: requestRes.data.json.data.requestId,
				feature: {
					key: "media.image.generate",
					version: "v1",
				},
				status: requestRes.data.json.data.status,
			},
		};
	}

	if (isCmsAiGenerateFailedData(requestRes.data.json.data)) {
		const errorMessage = getCmsAiGenerateFailedMessage(
			requestRes.data.json.data,
			context.translate("server:core.routes.ai.generate.error.message"),
		);
		const storeRes = await storeFailedGeneration(context, {
			requestId: requestRes.data.json.data.requestId,
			errorMessage,
			usage: requestRes.data.json.data.usage,
		});
		if (storeRes.error) return storeRes;

		return {
			error: {
				type: "basic",
				status: 502,
				message: copy.literal(errorMessage),
			},
			data: undefined,
		};
	}

	if (!isCmsAiGenerateCompletedData(requestRes.data.json.data)) {
		const storeRes = await storeFailedGeneration(context, {
			requestId: props.requestId,
			errorMessage: context.translate(
				"server:core.routes.ai.generate.error.message",
			),
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

	const outputParse = mediaImageOutputSchema.safeParse(
		requestRes.data.json.data.output,
	);
	if (!outputParse.success) {
		const storeRes = await storeFailedGeneration(context, {
			requestId: requestRes.data.json.data.requestId,
			errorMessage: context.translate(
				"server:core.routes.ai.generate.error.message",
			),
			usage: requestRes.data.json.data.usage,
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

	const response: MediaImageGenerateCompletionResponse = {
		mode: requestRes.data.json.data.mode,
		status: requestRes.data.json.data.status,
		requestId: requestRes.data.json.data.requestId,
		feature: {
			key: "media.image.generate",
			version: "v1",
		},
		output: outputParse.data,
		usage: requestRes.data.json.data.usage,
	};

	const storeRes = await completeStoredGeneration(context, {
		response,
	});
	if (storeRes.error) return storeRes;

	return {
		error: undefined,
		data: response,
	};
};

export default mediaImageCompletion;
