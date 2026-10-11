import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type {
	AgentToolExecution,
	AgentToolResult,
} from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import fromDocumentInput from "../../../documents/helpers/from-document-input.js";
import projectEditableDocument from "../../../documents/helpers/project-editable-document.js";
import resolveContentLocale from "../../../documents/helpers/resolve-content-locale.js";
import builderValidation from "../../helpers/builder/builder-validation.js";
import resolveBuilderScreen from "../../helpers/builder/resolve-builder-screen.js";
import type { ScreenResponse } from "../../helpers/builder/screen-call.js";
import screenUnavailableMessage from "../../helpers/builder/screen-unavailable-message.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Converts the screen's answer into the shape documents_get returns, with the builder's own validation errors. */
const handler: ServiceFn<
	[
		{
			input: z.output<typeof inputSchema>;
			execution: AgentToolExecution;
			response: ScreenResponse;
		},
	],
	AgentToolResult<z.output<typeof outputSchema>>
> = async (context, { input, execution, response }) => {
	const resolved = resolveBuilderScreen(context, execution);
	if (resolved.error) return resolved;
	if (response.status === "unavailable") {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: screenUnavailableMessage(response),
			},
		};
	}
	if (!response.document) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy("server:agent.screen.response.invalid"),
			},
		};
	}

	const { screen, collection } = resolved.data;
	const contentContext = {
		collection,
		localization: context.config.localization,
	};
	const data = fromDocumentInput(contentContext, response.document.content);
	if (data.error) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message:
					data.error.message ?? copy("server:agent.screen.response.invalid"),
			},
		};
	}

	const locale = resolveContentLocale(
		context,
		collection,
		input.contentLocale ?? response.document.contentLocale ?? undefined,
	);
	if (locale.error) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message:
					locale.error.message ?? copy("server:agent.screen.response.invalid"),
			},
		};
	}

	const projected = projectEditableDocument(contentContext, {
		data: data.data,
		contentLocale: locale.data,
		fieldKeys: input.fieldKeys,
		includeBricks: true,
		bricksPage: input.bricksPage,
		bricksPerPage: input.bricksPerPage,
	});
	if (projected.error) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message:
					projected.error.message ??
					copy("server:agent.screen.response.invalid"),
			},
		};
	}

	const validationErrors = await builderValidation(context, {
		execution,
		collection,
		content: response.document.content,
		documentId: screen.documentId,
		versionId: response.document.versionId,
	});

	return {
		error: undefined,
		data: {
			output: {
				document: {
					collectionKey: screen.collectionKey,
					documentId: screen.documentId,
					requestId: screen.requestId,
					name: screen.label,
				},
				unsaved: response.document.unsaved,
				editable: response.document.editable,
				contentLocale: locale.data,
				fields: projected.data.fields,
				bricks: projected.data.bricks,
				brickPagination: projected.data.brickPagination,
				validationErrors,
			},
			summary: copy("admin:core.tools.lucid_builder_read.summary"),
		},
	};
};

export default handler;
