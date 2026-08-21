import type { PreviewRuntimeState } from "@lucidcms/types";
import {
	createToolbarAttributes,
	type ToolbarAttributes,
} from "./attributes.js";
import type { ToolbarDocument } from "./types.js";

type DataResponse<TData> = {
	data?: TData;
};

export type ToolbarToolkitResponses = {
	authentication: DataResponse<{ authenticated: boolean }>;
	document: DataResponse<ToolbarDocument>;
	preview: DataResponse<PreviewRuntimeState>;
	/** Public host of the Lucid instance when it differs from the site origin. */
	host?: string | URL;
	editLabel?: string;
	previewExitUrl?: string | URL;
};

/** Adapts Lucid Toolkit responses into declarative toolbar attributes. */
export const toolbarFromToolkit = ({
	authentication,
	document,
	preview,
	host,
	editLabel,
	previewExitUrl,
}: ToolbarToolkitResponses): ToolbarAttributes | null =>
	createToolbarAttributes({
		host,
		document: document.data ?? null,
		editLabel,
		authentication:
			authentication.data?.authenticated === undefined
				? "auto"
				: authentication.data.authenticated,
		preview: preview.data ?? "auto",
		previewNavigation:
			previewExitUrl === undefined ? undefined : { exitUrl: previewExitUrl },
	});
