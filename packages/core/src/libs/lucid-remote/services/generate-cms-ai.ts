import type { ServiceFn } from "../../../utils/services/types.js";
import { getLucidRemoteClient } from "../client.js";
import { lucidRemotePaths } from "../constants.js";
import type { LucidRemoteRequestData } from "../types.js";

export type CmsAiGenerateRequestInputText<TRole extends string = string> = {
	type: "text";
	role: TRole;
	value: string;
};

export type CmsAiGenerateRequestInputImage<TRole extends string = string> = {
	type: "image";
	role: TRole;
	image:
		| {
				type: "url";
				url: string;
				detail?: "low" | "high" | "auto";
				filename?: string;
				mimeType?: string;
		  }
		| {
				type: "base64";
				data: string;
				mimeType: "image/webp";
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
		key: "custom-field-input";
		version: "v1";
	},
	CmsAiGenerateRequestInputText<
		"user-instruction" | "field-instructions" | "guidance"
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
			details?: unknown;
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

export type CmsAiGenerateRequest =
	| CustomFieldInputV1Request
	| MediaAltGenerateV1Request;

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
			input: number;
			output: number;
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
		retries: 1,
		method: "POST",
		headers: {
			Authorization: `Bearer ${props.licenseKey}`,
		},
		body: props.request,
	});
};

export default generateCmsAi;
