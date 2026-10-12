import type {
	AiGeneratedContent,
	AiGenerateMode,
	AiGenerateUsage,
} from "@lucidcms/types";

import type { MediaAnalyzeRequest } from "../../schema/media.js";

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

type CmsAiGenerateBaseRequest<
	TFeature extends {
		key: string;
		version: string;
	},
	TInput extends CmsAiGenerateRequestInput,
	TContext,
> = {
	feature: TFeature;
	/** Groups attempts made together, so Lucid can see how many it took. */
	sessionId?: string;
	input: TInput[];
	context: TContext;
};

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
			target: string | string[] | null;
		};
		media: {
			id?: string | number;
			name?: string | Record<string, string>;
			alt?: string | Record<string, string>;
		};
		previousResponses?: {
			instruction?: string;
			output: AiGeneratedContent<string>;
		}[];
	}
>;

export type MediaImageGenerateV1Request = {
	feature: {
		key: "media.image.generate";
		version: "v1";
	};
	sessionId?: string;
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
		/** Defaults to Lucid's default image model. */
		model?: string;
		aspectRatio: string;
		/** Left out for the model's default. */
		resolution?: string;
		quality?: string;
		outputFormat?: string;
	};
};

export type MediaAudioGenerateV1Request = {
	feature: {
		key: "media.audio.generate";
		version: "v1";
	};
	sessionId?: string;
	input: CmsAiGenerateRequestInputText<"script" | "user-instruction">[];
	generation: {
		/** Defaults to Lucid's default speech model. */
		model?: string;
		/** Defaults to the model's default voice. */
		voice?: string;
	};
};

export type AgentTitleGenerateV1Request = CmsAiGenerateBaseRequest<
	{ key: "agent.title.generate"; version: "v1" },
	CmsAiGenerateRequestInputText<"conversation">,
	Record<string, never>
>;

export type CmsAiGenerateRequest =
	| MediaAnalyzeRequest
	| AgentTitleGenerateV1Request
	| MediaAltGenerateV1Request
	| MediaImageGenerateV1Request
	| MediaAudioGenerateV1Request;

export type CmsAiGenerateRequestFeature = CmsAiGenerateRequest["feature"];

export type GenerateCmsAiProps = {
	accessToken: string;
	request: CmsAiGenerateRequest;
	idempotencyKey?: string;
	/** Stops waiting when the caller cancels the request. */
	signal?: AbortSignal;
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
