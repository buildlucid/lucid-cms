import z from "zod";
import { copy } from "../../libs/i18n/index.js";
import type {
	CmsAiGenerateData,
	MediaAltGenerateV1Request,
} from "../../libs/lucid-remote/services/generate-cms-ai.js";
import { generateCmsAi } from "../../libs/lucid-remote/services/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getLicenseKey from "../options/get-license-key.js";
import storeGeneration from "./helpers/store-generation.js";

const mediaAltOutputSchema = z.record(z.string(), z.string());

const mediaAltGenerate: ServiceFn<
	[
		{
			instruction?: string;
			guidance?: string;
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
	CmsAiGenerateData
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

	if (props.guidance) {
		const guidance = context.config.ai.guidance.find(
			(item) => item.key === props.guidance,
		);
		if (!guidance) {
			return {
				error: {
					type: "basic",
					status: 400,
					message: copy("server:core.ai.guidance.not.found"),
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

	const response = {
		...generateRes.data.json.data,
		output: outputParse.data,
	};
	const storeRes = await storeGeneration(context, {
		userId: props.userId,
		response,
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
		data: response,
	};
};

export default mediaAltGenerate;
