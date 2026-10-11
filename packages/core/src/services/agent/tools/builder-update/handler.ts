import type z from "zod";
import constants from "../../../../constants/constants.js";
import { getDocumentShape } from "../../../../libs/collection/helpers/get-document-shape.js";
import { copy } from "../../../../libs/i18n/index.js";
import type {
	AgentToolExecution,
	AgentToolInteraction,
	AgentToolResult,
} from "../../../../libs/tools/types.js";
import type { agentScreenCallSchema } from "../../../../schemas/agent-screen.js";
import type { AgentBuilderChangesData } from "../../../../types/response.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import fromDocumentInput from "../../../documents/helpers/from-document-input.js";
import patchDocumentData from "../../../documents/helpers/patch-document-data.js";
import resolveContentLocale from "../../../documents/helpers/resolve-content-locale.js";
import resolveContentRefs from "../../../documents/helpers/resolve-content-refs.js";
import toDocumentInput from "../../../documents/helpers/to-document-input.js";
import buildOperations from "../../../documents/tools/update/build-operations.js";
import builderChanges from "../../helpers/builder/builder-changes.js";
import builderValidation from "../../helpers/builder/builder-validation.js";
import resolveBuilderScreen from "../../helpers/builder/resolve-builder-screen.js";
import type {
	ScreenCall,
	ScreenResponse,
} from "../../helpers/builder/screen-call.js";
import screenCall from "../../helpers/builder/screen-call.js";
import screenUnavailableMessage from "../../helpers/builder/screen-unavailable-message.js";
import { builderUpdateTitle } from "./constants.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Converts a builder read into a request for only changed content, then reports the unsaved update. */
const handler: ServiceFn<
	[
		{
			input: z.output<typeof inputSchema>;
			execution: AgentToolExecution;
			call: z.output<typeof agentScreenCallSchema>;
			response: ScreenResponse;
		},
	],
	| AgentToolResult<z.output<typeof outputSchema>>
	| AgentToolInteraction<ScreenCall>
> = async (context, { input, execution, call, response }) => {
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

	const { screen, collection } = resolved.data;
	if (call.action === "update") {
		return {
			error: undefined,
			data: {
				output: {
					applied: true,
					validationErrors: call.validationErrors,
					note: call.validationErrors.length
						? "The changes are in the person's document builder as unsaved edits, but some fields aren't valid yet, so fix them before you finish. Paths name bricks by ref, or by key for fixed bricks."
						: "The changes are in the person's document builder as unsaved edits. They review and save them, and autosave waits until they do. The chat lists the fields you changed.",
				},
				summary: copy("admin:core.tools.lucid_builder_update.summary"),
				widgets: [
					{
						key: constants.agent.widgets.builderChanges,
						version: 1,
						data: {
							document: {
								collectionKey: screen.collectionKey,
								documentId: screen.documentId,
								requestId: screen.requestId,
							},
							changes: call.changes,
						} satisfies AgentBuilderChangesData,
					},
				],
			},
		};
	}
	if (call.action !== "read" || !response.document) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy("server:agent.screen.response.invalid"),
			},
		};
	}
	if (!response.document.editable) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: copy("server:agent.screen.unavailable.locked"),
			},
		};
	}

	const contentContext = {
		collection,
		localization: context.config.localization,
	};
	const current = fromDocumentInput(contentContext, response.document.content);
	if (current.error) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message:
					current.error.message ?? copy("server:agent.screen.response.invalid"),
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

	const operations = buildOperations({
		shape: getDocumentShape(contentContext),
		current: current.data,
		fields: input.fields,
		bricks: input.bricks,
		locale: locale.data,
	});
	if (operations.error) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message:
					operations.error.message ??
					copy("server:agent.screen.response.invalid"),
			},
		};
	}

	const patched = patchDocumentData(
		contentContext,
		current.data,
		operations.data,
	);
	if (patched.error) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message:
					patched.error.message ?? copy("server:agent.screen.response.invalid"),
			},
		};
	}

	const before = toDocumentInput(
		contentContext,
		current.data,
		response.document.content,
	);
	if (before.error) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message:
					before.error.message ?? copy("server:agent.screen.response.invalid"),
			},
		};
	}

	const after = toDocumentInput(
		contentContext,
		patched.data,
		response.document.content,
	);
	if (after.error) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message:
					after.error.message ?? copy("server:agent.screen.response.invalid"),
			},
		};
	}

	const { content, changes } = builderChanges(
		before.data,
		after.data,
		new Set(
			input.bricks?.flatMap((brick) =>
				brick.ref !== undefined && brick.before !== undefined && !brick.remove
					? [brick.ref]
					: [],
			),
		),
	);
	if (changes.length === 0) {
		return {
			error: undefined,
			data: {
				output: {
					applied: false,
					note: "The document already had these values.",
				},
				summary: copy(
					"admin:core.tools.lucid_builder_update.summary.unchanged",
				),
			},
		};
	}

	const refs = await resolveContentRefs(context, {
		collection,
		content: { fields: content.fields, bricks: content.bricks },
	});
	if (refs.error) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message:
					refs.error.message ?? copy("server:agent.screen.response.invalid"),
			},
		};
	}

	const validationErrors = await builderValidation(context, {
		execution,
		collection,
		content: after.data,
		documentId: screen.documentId,
		versionId: response.document.versionId,
	});

	return {
		error: undefined,
		data: screenCall(context, {
			title: builderUpdateTitle,
			call: {
				action: "update",
				screen,
				revision: response.document.revision,
				versionId: response.document.versionId,
				content,
				refs: refs.data,
				changes,
				validationErrors,
			},
		}),
	};
};

export default handler;
