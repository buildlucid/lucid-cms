import type { MediaImageGenerateResponse } from "@lucidcms/types";
import { copy } from "../../libs/i18n/index.js";
import type { MediaImageGenerateV1Request } from "../../libs/lucid-remote/services/generate-cms-ai.js";
import { generateCmsAi } from "../../libs/lucid-remote/services/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getLicenseKey from "../options/get-license-key.js";
import storeGeneration from "./helpers/store-generation.js";

const mediaImageGenerate: ServiceFn<
	[
		{
			instruction: string;
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

	input.push({
		type: "text",
		role: "user-instruction",
		value: props.instruction,
	});

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
