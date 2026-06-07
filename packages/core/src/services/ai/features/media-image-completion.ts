import type {
	MediaImageGenerateCompletionPollResponse,
	MediaImageGenerateCompletionResponse,
} from "@lucidcms/types";
import z from "zod";
import { copy } from "../../../libs/i18n/index.js";
import { getCmsAiRequest } from "../../../libs/lucid-remote/services/index.js";
import {
	isCmsAiGenerateAcceptedData,
	isCmsAiGenerateCompletedData,
} from "../../../libs/lucid-remote/utils.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getLicenseKey from "../../options/get-license-key.js";
import completeStoredGeneration from "../storage/complete-stored-generation.js";

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
	if (requestRes.error) return requestRes;

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

	if (!isCmsAiGenerateCompletedData(requestRes.data.json.data)) {
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
