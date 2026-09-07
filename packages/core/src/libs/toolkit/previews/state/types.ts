import type z from "zod";
import type {
	PreviewRuntimeState,
	PreviewSession,
} from "../../../../exports/types.js";
import type { inputSchema } from "./schema.js";

type MaybePromise<T> = T | Promise<T>;

export type ToolkitPreviewSource = "query" | "stored" | "exit" | null;

export type ToolkitPreviewStore = {
	/** Reads the raw preview token persisted by the frontend adapter. */
	get: () => MaybePromise<string | null | undefined>;
	/** Persists a validated perspective preview until its server-issued expiry. */
	set: (preview: { token: string; expiresAt: string }) => MaybePromise<void>;
	/** Clears the frontend's persisted preview. */
	clear: () => MaybePromise<void>;
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
	  });
