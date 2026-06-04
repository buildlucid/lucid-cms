import type { MediaImageGenerateResponse } from "@lucidcms/types";
import { copy } from "../../libs/i18n/index.js";
import type { MediaImageGenerateV1Request } from "../../libs/lucid-remote/services/generate-cms-ai.js";
import { generateCmsAi } from "../../libs/lucid-remote/services/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getLicenseKey from "../options/get-license-key.js";
import storeGeneration from "./helpers/store-generation.js";

const imageGuidanceInstructions = {
	natural:
		"Create a natural, realistic image with balanced lighting, believable details, and an authentic visual style.",
	editorial:
		"Create a polished editorial image with strong composition, refined lighting, and a magazine-quality finish.",
	product:
		"Create a clean product-focused image with controlled lighting, clear subject emphasis, and minimal distractions.",
	illustration:
		"Create a refined non-photographic illustration with cohesive colors, clear forms, and a polished visual style.",
	cinematic:
		"Create a cinematic image with dramatic composition, atmospheric lighting, and strong visual storytelling.",
} as const;

const mediaImageGenerate: ServiceFn<
	[
		{
			instruction?: string;
			guidance?: string;
			image?: Extract<
				MediaImageGenerateV1Request["input"][number],
				{ type: "image" }
			>["image"];
			previousInstructions?: string[];
			generation: MediaImageGenerateV1Request["generation"];
			userId: number;
		},
	],
	MediaImageGenerateResponse
> = async (context, props) => {
	const licenseKeyRes = await getLicenseKey(context);
	if (licenseKeyRes.error) return licenseKeyRes;

	const input: MediaImageGenerateV1Request["input"] = [];
	const instruction = props.instruction?.trim();
	const guidance = props.guidance
		? imageGuidanceInstructions[
				props.guidance as keyof typeof imageGuidanceInstructions
			]
		: undefined;

	if (props.guidance && !guidance) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.ai.guidance.not.found"),
			},
			data: undefined,
		};
	}

	if (!instruction && (!props.guidance || !props.image)) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy(
					"server:core.ai.media.image.generate.instruction.or.guidance.required",
				),
			},
			data: undefined,
		};
	}

	if (instruction) {
		input.push({
			type: "text",
			role: "user-instruction",
			value: instruction,
		});
	}

	if (guidance) {
		input.push({
			type: "text",
			role: "guidance",
			value: guidance,
		});
	}

	if (props.image) {
		input.push({
			type: "image",
			role: "source-image",
			image: props.image,
		});
	}

	const request: MediaImageGenerateV1Request = {
		feature: {
			key: "media.image.generate",
			version: "v1",
		},
		input,
		context: {
			previousInstructions:
				props.previousInstructions && props.previousInstructions.length > 0
					? props.previousInstructions
					: undefined,
		},
		generation: props.generation,
	};

	const generateRes = await generateCmsAi(context, {
		licenseKey: licenseKeyRes.data,
		request,
	});
	if (generateRes.error) return generateRes;

	const response: MediaImageGenerateResponse = {
		...generateRes.data.json.data,
		feature: {
			key: "media.image.generate",
			version: "v1",
		},
		output: generateRes.data.json.data
			.output as MediaImageGenerateResponse["output"],
	};

	const storeRes = await storeGeneration(context, {
		userId: props.userId,
		response,
		targetType: "media-image",
		target: {
			generation: props.generation,
			guidance: props.guidance ?? null,
			previousInstructions: props.previousInstructions ?? [],
			sourceImage: props.image
				? {
						type: props.image.type,
						detail: props.image.detail ?? null,
						filename: props.image.filename ?? null,
						mimeType: props.image.mimeType ?? null,
					}
				: null,
		},
	});
	if (storeRes.error) return storeRes;

	return {
		error: undefined,
		data: response,
	};
};

export default mediaImageGenerate;
