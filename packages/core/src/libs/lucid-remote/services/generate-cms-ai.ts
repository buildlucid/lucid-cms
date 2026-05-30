import type { ServiceFn } from "../../../utils/services/types.js";
import { getLucidRemoteClient } from "../client.js";
import { lucidRemotePaths } from "../constants.js";
import type { LucidRemoteRequestData } from "../types.js";

export type CmsAiGenerateRequestInputText<TRole extends string = string> = {
	type: "text";
	role: TRole;
	value: string;
};

export type CmsAiGenerateRequestInputImage<
	TRole extends string = string,
	TMimeType extends string = string,
> = {
	type: "image";
	role: TRole;
	image:
		| {
				type: "url";
				url: string;
				detail?: "low" | "high" | "auto";
				filename?: string;
				mimeType?: TMimeType;
		  }
		| {
				type: "base64";
				data: string;
				mimeType: TMimeType;
				detail?: "low" | "high" | "auto";
				filename?: string;
		  };
};

export type CmsAiGenerateRequestInput =
	| CmsAiGenerateRequestInputText
	| CmsAiGenerateRequestInputImage;

export type CmsAiGenerateRequestItem =
	| {
			type: "text";
			label: string;
			value: string;
	  }
	| {
			type: "json";
			label: string;
			value: unknown;
	  };

type CmsAiGenerateBaseRequest<
	TFeature extends {
		key: string;
		version: string;
	},
	TInput extends CmsAiGenerateRequestInput,
	TContext,
> = {
	feature: TFeature;
	input: TInput[];
	context: TContext;
};

export type CustomFieldInputV1Request = CmsAiGenerateBaseRequest<
	{
		key: "custom-field.input.generate";
		version: "v1";
	},
	CmsAiGenerateRequestInputText<
		"user-instruction" | "field-instruction" | "guidance"
	>,
	{
		locale: {
			source?: string;
			target: string | string[];
		};
		collection: {
			key: string;
		};
		field: {
			key: string;
			type: string;
			details?: {
				label?: string;
				summary?: string;
			};
			translations?: Record<string, unknown>;
			valueSchema: unknown;
		};
		items: CmsAiGenerateRequestItem[];
	}
>;

export type MediaAltGenerateV1Request = CmsAiGenerateBaseRequest<
	{
		key: "media.alt.generate";
		version: "v1";
	},
	| CmsAiGenerateRequestInputText<"user-instruction" | "guidance">
	| CmsAiGenerateRequestInputImage<"source-image">,
	{
		locale: {
			source?: string;
			target: string | string[];
		};
		media: {
			id?: string | number;
			name?: Record<string, string>;
			alt?: Record<string, string>;
		};
	}
>;

export type MediaImageGenerateV1Request = {
	feature: {
		key: "media.image.generate";
		version: "v1";
	};
	input: (
		| CmsAiGenerateRequestInputText<"user-instruction" | "guidance">
		| CmsAiGenerateRequestInputImage<
				"source-image",
				"image/webp" | "image/png" | "image/jpeg"
		  >
	)[];
	generation: {
		size:
			| "auto"
			| "1024x1024"
			| "1536x1024"
			| "1024x1536"
			| "2048x2048"
			| "2048x1152"
			| "3840x2160"
			| "2160x3840";
		quality: "auto" | "low" | "medium" | "high";
		outputFormat: "webp" | "png" | "jpeg";
	};
};

export type CmsAiGenerateRequest =
	| CustomFieldInputV1Request
	| MediaAltGenerateV1Request
	| MediaImageGenerateV1Request;

export type CmsAiGenerateRequestFeature = CmsAiGenerateRequest["feature"];

type GenerateCmsAiProps = {
	licenseKey: string;
	request: CmsAiGenerateRequest;
};

export type CmsAiGenerateData = {
	requestId: string;
	feature: CmsAiGenerateRequest["feature"];
	output: unknown;
	usage: {
		model: string;
		providerRequestId?: string;
		tokens: {
			input: {
				text: number;
				image: number;
				audio: number;
				cached: {
					total: number;
					text: number;
					image: number;
					audio: number;
				};
				total: number;
			};
			output: {
				text: number;
				image: number;
				audio: number;
				reasoning: number;
				acceptedPrediction: number;
				rejectedPrediction: number;
				total: number;
			};
			total: number;
		};
		cost: {
			currency: string;
			totalCostMinor: number;
		};
	};
};

/**
 * Runs a CMS AI feature against Lucid's remote AI API.
 */
const generateCmsAi: ServiceFn<
	[GenerateCmsAiProps],
	LucidRemoteRequestData<CmsAiGenerateData>
> = async (context, props) => {
	const client = getLucidRemoteClient(context);

	return client.request<CmsAiGenerateData>(lucidRemotePaths.generateCmsAi, {
		retries: 0,
		method: "POST",
		headers: {
			Authorization: `Bearer ${props.licenseKey}`,
		},
		body: props.request,
	});
};

export default generateCmsAi;
