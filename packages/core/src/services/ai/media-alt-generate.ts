import type { MediaAltGenerateResponse } from "@lucidcms/types";
import z from "zod";
import { copy } from "../../libs/i18n/index.js";
import type { MediaAltGenerateV1Request } from "../../libs/lucid-remote/services/generate-cms-ai.js";
import { generateCmsAi } from "../../libs/lucid-remote/services/index.js";
import { isCmsAiGenerateCompletedData } from "../../libs/lucid-remote/utils.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getLicenseKey from "../options/get-license-key.js";
import storeGeneration from "./storage/store-generation.js";

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

	const outputParse = mediaAltOutputSchema.safeParse(
		generateRes.data.json.data.output,
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

	const missingLocale = props.locale.target.find(
		(locale) => outputParse.data[locale] === undefined,
	);
	if (missingLocale) {
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
		response: generateRes.data.json.data,
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
	});
	if (storeRes.error) return storeRes;

	return {
		error: undefined,
		data: {
			mode: generateRes.data.json.data.mode,
			requestId: generateRes.data.json.data.requestId,
			feature: {
				key: "media.alt.generate",
				version: "v1",
			},
			output: outputParse.data,
			usage: generateRes.data.json.data.usage,
		},
	};
};

export default mediaAltGenerate;
