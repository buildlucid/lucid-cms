import { copy } from "../../../../libs/i18n/index.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import defineMcpTool from "../../../../libs/tools/define-mcp-tool.js";
import previewMedia from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const previewMediaMcpTool = () =>
	defineMcpTool({
		name: "media_preview",
		title: copy("admin:core.tools.media_preview.title"),
		description:
			"Preview an image or video poster as a public URL or inline image. Inline images are limited to 1024px and 1 MiB.",
		input: inputSchema,
		output: outputSchema,
		scopes: [ExternalScopes.MediaRead],
		annotations: { readOnlyHint: true },
		handler: ({ context, input, execution }) =>
			previewMedia(context, { input, signal: execution.signal }),
	});
