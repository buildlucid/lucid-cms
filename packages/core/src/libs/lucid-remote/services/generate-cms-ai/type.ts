import type { AiGeneratedContent } from "@lucidcms/types";
import type { MediaAnalyzeRequest } from "../../schema/media.js";
import type { WebRequest } from "../../schema/web.js";

/** Request principal used by Lucid to derive a safety identity. */
export type CmsAiActor = { type: "user"; id: number } | { type: "system" };

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

/** Text from one document to translate from its source locale into one target locale. */
export type ContentTranslateSegment = {
	/** Unique within the request, matching `^[a-z0-9_-]{1,40}$`. */
	id: string;
	/** HTML segments are rich text, whose tags and attributes must come back unchanged. */
	format: "text" | "html";
	text: string;
	/** The field's labels from its brick down, eg. `Hero › Heading`. */
	label?: string;
	/** Guidance on the field written for models. */
	instructions?: string;
	maxLength?: number;
};

export type ContentTranslateV1Request = CmsAiGenerateBaseRequest<
	{ key: "content.translate"; version: "v1" },
	CmsAiGenerateRequestInputText<"user-instruction">,
	{
		locale: {
			source: { code: string; label: string };
			target: { code: string; label: string };
		};
		document?: { collection?: string; title?: string };
		/** Notes on tone and style for the target locale. */
		style?: string;
		/** Terms to keep (null translation) or always translate the same way. */
		glossary?: Array<{ term: string; translation: string | null }>;
		segments: ContentTranslateSegment[];
	}
>;

export type CmsAiGenerateRequest =
	| MediaAnalyzeRequest
	| AgentTitleGenerateV1Request
	| MediaAltGenerateV1Request
	| ContentTranslateV1Request
	| MediaImageGenerateV1Request
	| MediaAudioGenerateV1Request
	| WebRequest;

export type CmsAiGenerateRequestFeature = CmsAiGenerateRequest["feature"];

export type GenerateCmsAiProps = {
	accessToken: string;
	actor: CmsAiActor;
	request: CmsAiGenerateRequest;
	idempotencyKey?: string;
	/** Stops waiting when the caller cancels the request. */
	signal?: AbortSignal;
};
