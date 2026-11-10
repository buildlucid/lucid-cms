import { copy } from "../../../../libs/i18n/index.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import previewMedia from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const previewMediaMcpTool = () =>
	defineTool({
		name: "media_preview",
		title: copy("admin:core.tools.media_preview.title"),
		description:
			"Preview an image or video poster as a public URL or inline image. Inline images are limited to 1024px and 1 MiB.",
		input: inputSchema,
		output: outputSchema,
		readOnly: true,
		mcp: {
			scopes: [ExternalScopes.MediaRead],
		},
		handler: async ({ context, input, execution }) => {
			const result = await previewMedia(context, {
				input,
				signal: execution.signal,
			});
			if (result.error) throw new LucidError(result.error);
			return result.data;
		},
	}).mcp;
