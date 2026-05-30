import z from "zod";
import { copy } from "../../libs/i18n/index.js";
import type { MediaAltGenerateV1Request } from "../../libs/lucid-remote/services/generate-cms-ai.js";
import { generateCmsAi } from "../../libs/lucid-remote/services/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getLicenseKey from "../options/get-license-key.js";

const mediaAltOutputSchema = z.record(z.string(), z.string().max(250));

const mediaAlt: ServiceFn<
	[
		{
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
		},
	],
	Record<string, string>
> = async (context, props) => {
	const licenseKeyRes = await getLicenseKey(context);
	if (licenseKeyRes.error) return licenseKeyRes;

	const request: MediaAltGenerateV1Request = {
		feature: {
			key: "media.alt.generate",
			version: "v1",
		},
		input: [
			{
				type: "image",
				role: "source-image",
				image: {
					type: "base64",
					data: props.image.data,
					mimeType: props.image.mimeType,
					detail: props.image.detail,
					filename: props.image.filename,
				},
			},
		],
		context: {
			locale: props.locale,
			media: props.media,
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

	return {
		error: undefined,
		data: outputParse.data,
	};
};

export default mediaAlt;
