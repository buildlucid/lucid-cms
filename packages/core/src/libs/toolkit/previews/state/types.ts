import type z from "zod";
import type {
	PreviewRuntimeState,
	PreviewSession,
} from "../../../../exports/types.js";
import type { inputSchema } from "./schema.js";

type MaybePromise<T> = T | Promise<T>;

export type ToolkitPreviewSource = "query" | "stored" | "exit" | null;

export type ToolkitPreviewCookieOptions = {
	path: string;
	httpOnly: boolean;
	sameSite: "lax";
	secure: boolean;
	expires?: Date;
};

/** The host framework's request and response cookies, which keep a navigable preview while its site is browsed. */
export type ToolkitPreviewCookies = {
	get: (name: string) => MaybePromise<string | null | undefined>;
	set: (
		name: string,
		value: string,
		options: ToolkitPreviewCookieOptions,
	) => MaybePromise<void>;
	delete: (
		name: string,
		options: ToolkitPreviewCookieOptions,
	) => MaybePromise<void>;
};

export type ToolkitPreviewResponseHeaders = {
	/** Sets a response header on the host framework's current response. */
	set: (name: string, value: string) => MaybePromise<void>;
};

export type ToolkitPreviewStateInput = z.input<typeof inputSchema>;

export type ToolkitPreviewState =
	| (Extract<PreviewRuntimeState, { kind: "published" }> & {
			source: Extract<ToolkitPreviewSource, "exit" | null>;
	  })
	| (Extract<PreviewRuntimeState, { kind: "preview" }> & {
			source: Extract<ToolkitPreviewSource, "query" | "stored">;
			entry: PreviewSession["entry"];
			/** Whether the page renders in the builder's preview frame, where editors see placeholders for empty fields. */
			builder: boolean;
	  });
