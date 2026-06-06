import type { AiGenerateMode, AiGenerateUsage } from "@lucidcms/types";
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
	| CmsAiGenerateRequestInputText<"user-instruction">
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
		previousResponses?: {
			instruction?: string;
			output: Record<string, string>;
		}[];
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
	context: {
		previousInstructions?: string[];
	};
	generation: {
		size:
			| "auto"
			| "1024x1024"
			| "1536x1024"
			| "1024x1536"
			| "2048x2048"
			| "2048x1152"
			| "3840x2160"
			| "2160x3840"
			| [number, number];
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
	idempotencyKey?: string;
};

export type CmsAiGenerateCompletedData = {
	mode: AiGenerateMode;
	status?: "complete";
	requestId: string;
	feature: CmsAiGenerateRequest["feature"];
	output: unknown;
	usage: AiGenerateUsage;
};

export type CmsAiGenerateAcceptedData = {
	mode: "async";
	requestId: string;
	feature: CmsAiGenerateRequest["feature"];
	status: "queued" | "processing";
};

export type CmsAiGenerateData =
	| CmsAiGenerateCompletedData
	| CmsAiGenerateAcceptedData;

/**
 * Runs a CMS AI feature against Lucid's remote AI API.
 */
const generateCmsAi: ServiceFn<
	[GenerateCmsAiProps],
	LucidRemoteRequestData<CmsAiGenerateData>
> = async (context, props) => {
	const client = getLucidRemoteClient(context);
	const headers = new Headers();

	headers.append("Authorization", `Bearer ${props.licenseKey}`);
	headers.append("idempotency-key", props.idempotencyKey ?? "");

	return client.request<CmsAiGenerateData>(lucidRemotePaths.generateCmsAi, {
		retries: 0,
		method: "POST",
		headers,
		body: props.request,
	});
};

export default generateCmsAi;
