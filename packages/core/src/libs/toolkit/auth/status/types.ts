import type z from "zod";
import type { inputSchema } from "./schema.js";

type MaybePromise<T> = T | Promise<T>;

export type ToolkitAuthCookieStore = {
	/** Reads a Lucid session cookie from the frontend framework's current request. */
	get: (name: string) => MaybePromise<string | null | undefined>;
};

export type ToolkitAuthResponseHeaders = {
	/** Sets a response header on the frontend framework's current response. */
	set: (name: string, value: string) => MaybePromise<void>;
};

export type ToolkitAuthStatusInput = z.input<typeof inputSchema>;

export type ToolkitAuthStatus = {
	authenticated: boolean;
};
