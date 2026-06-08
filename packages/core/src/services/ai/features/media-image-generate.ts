import type { MediaImageGenerateResponse } from "@lucidcms/types";
import { copy } from "../../../libs/i18n/index.js";
import type { MediaImageGenerateV1Request } from "../../../libs/lucid-remote/services/generate-cms-ai.js";
import { generateCmsAi } from "../../../libs/lucid-remote/services/index.js";
import { isCmsAiGenerateAcceptedData } from "../../../libs/lucid-remote/utils.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getLicenseKey from "../../options/get-license-key.js";
import storeGeneration from "../storage/store-generation.js";
import storePendingGeneration from "../storage/store-pending-generation.js";

const imageGuidanceInstructions = {
	natural:
		"Create a realistic photograph with natural light, believable texture, accurate perspective, and minimal stylization.",
	lifestyle:
		"Create a polished lifestyle image suited to a brand story or magazine article, with a real-world setting, composed framing, and natural lighting.",
	product:
		"Create a clean studio product image with crisp detail, controlled lighting, accurate materials, and minimal background distractions.",
	illustration:
		"Create a polished non-photographic illustration with clear shapes, cohesive colors, intentional texture, and no photorealistic camera effects.",
	cinematic:
		"Create a story-led cinematic image with dramatic composition, atmospheric lighting, depth, and a believable mood.",
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
			idempotencyKey?: string;
			userId: number;
		},
	],
	MediaImageGenerateResponse
> = async (context, props) => {
	const requestStartedAt = Date.now();
	const licenseKeyRes = await getLicenseKey(context);
	if (licenseKeyRes.error) return licenseKeyRes;

	const idempotencyKey = props.idempotencyKey?.trim();
	if (!idempotencyKey) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy(
					"server:core.ai.media.image.generate.idempotency.key.required",
				),
			},
			data: undefined,
		};
	}

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
		idempotencyKey,
	});
	if (generateRes.error) return generateRes;
	const responseData = generateRes.data.json.data;

	const target = {
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
	};

	const storeRes = isCmsAiGenerateAcceptedData(responseData)
		? await storePendingGeneration(context, {
				userId: props.userId,
				requestId: responseData.requestId,
				feature: {
					key: "media.image.generate",
					version: "v1",
				},
				targetType: "media-image",
				target,
			})
		: await storeGeneration(context, {
				userId: props.userId,
				response: responseData,
				targetType: "media-image",
				requestStartedAt,
				target,
			});
	if (storeRes.error) return storeRes;

	return {
		error: undefined,
		data: {
			mode: "async",
			requestId: responseData.requestId,
			feature: {
				key: "media.image.generate",
				version: "v1",
			},
			status: isCmsAiGenerateAcceptedData(responseData)
				? responseData.status
				: "processing",
		},
	};
};

export default mediaImageGenerate;
