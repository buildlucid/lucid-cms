import z from "zod";
import constants from "../../../../constants/constants.js";
import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { getDocumentShape } from "../../../../libs/collection/helpers/get-document-shape.js";
import { copy } from "../../../../libs/i18n/index.js";
import { agentBuilderChangeSchema } from "../../../../schemas/agent-screen.js";
import type { AgentBuilderChangesData } from "../../../../types/response.js";
import fromDocumentInput from "../../../documents/helpers/from-document-input.js";
import patchDocumentData from "../../../documents/helpers/patch-document-data.js";
import resolveContentLocale from "../../../documents/helpers/resolve-content-locale.js";
import resolveContentRefs from "../../../documents/helpers/resolve-content-refs.js";
import toDocumentInput from "../../../documents/helpers/to-document-input.js";
import buildOperations from "../../../documents/tools/update/build-operations.js";
import { toolErrorFailure, toolFailure, toolResult } from "../tool-outcome.js";
import builderChanges from "./builder-changes.js";
import builderValidation from "./builder-validation.js";
import {
	resolveBuilderScreen,
	screenCall,
	screenUnavailable,
	takeScreenAnswer,
} from "./screen-call.js";
import type { RunnerToolInputHandler } from "./types.js";

const title = copy("admin:core.tools.lucid_builder_update.title");
//* what the update call handed the builder, which the result reports once it's applied
const appliedSchema = z.object({
	changes: z.array(agentBuilderChangeSchema),
	validationErrors: z.array(z.string()),
});

/** Applies only the changed parts of the builder's unsaved content when those parts still match the read, leaving saving to the person. */
const builderUpdate: RunnerToolInputHandler<
	typeof runnerTools.builderUpdate
> = async (context, props) => {
	const resolved = resolveBuilderScreen(context, props);
	if (resolved.error) return resolved.error;

	const { screen, collection } = resolved.data;
	const answered = takeScreenAnswer(props);
	if (!answered) {
		return screenCall(context, {
			callId: props.call.id,
			title,
			call: { action: "read", screen },
		});
	}

	const { response } = answered;
	if (response.status === "unavailable") {
		return screenUnavailable(context, response);
	}
	if (answered.action === "update") {
		const sent = appliedSchema.safeParse(answered.sent);
		const validationErrors = sent.success ? sent.data.validationErrors : [];

		return toolResult({
			output: {
				applied: true,
				validationErrors,
				note: validationErrors.length
					? "The changes are in the person's document builder as unsaved edits, but some fields aren't valid yet, so fix them before you finish. Paths name bricks by ref, or by key for fixed bricks."
					: "The changes are in the person's document builder as unsaved edits. They review and save them, and autosave waits until they do. The chat lists the fields you changed.",
			},
			summary: copy("admin:core.tools.lucid_builder_update.summary"),
			widgets: sent.success
				? [
						{
							key: constants.agent.widgets.builderChanges,
							version: 1,
							data: {
								document: {
									collectionKey: screen.collectionKey,
									documentId: screen.documentId,
									requestId: screen.requestId,
								},
								changes: sent.data.changes,
							} satisfies AgentBuilderChangesData,
						},
					]
				: undefined,
		});
	}
	if (!response.document) {
		return toolFailure(
			context.translate("server:agent.screen.response.invalid"),
		);
	}
	if (!response.document.editable) {
		return screenUnavailable(context, {
			status: "unavailable",
			reason: "locked",
		});
	}

	const contentContext = {
		collection,
		localization: context.config.localization,
	};
	const current = fromDocumentInput(contentContext, response.document.content);
	if (current.error) {
		return toolErrorFailure(
			context,
			current.error,
			"server:agent.screen.response.invalid",
		);
	}

	const locale = resolveContentLocale(
		context,
		collection,
		props.input.contentLocale ?? response.document.contentLocale ?? undefined,
	);
	if (locale.error) {
		return toolErrorFailure(
			context,
			locale.error,
			"server:agent.screen.response.invalid",
		);
	}

	const operations = buildOperations({
		shape: getDocumentShape(contentContext),
		current: current.data,
		fields: props.input.fields,
		bricks: props.input.bricks,
		locale: locale.data,
	});
	if (operations.error) {
		return toolErrorFailure(
			context,
			operations.error,
			"server:agent.screen.response.invalid",
		);
	}

	const patched = patchDocumentData(
		contentContext,
		current.data,
		operations.data,
	);
	if (patched.error) {
		return toolErrorFailure(
			context,
			patched.error,
			"server:agent.screen.response.invalid",
		);
	}

	//* both sides go through the same conversion, so only real changes differ
	const before = toDocumentInput(
		contentContext,
		current.data,
		response.document.content,
	);
	if (before.error) {
		return toolErrorFailure(
			context,
			before.error,
			"server:agent.screen.response.invalid",
		);
	}

	const after = toDocumentInput(
		contentContext,
		patched.data,
		response.document.content,
	);
	if (after.error) {
		return toolErrorFailure(
			context,
			after.error,
			"server:agent.screen.response.invalid",
		);
	}

	const { content, changes } = builderChanges(
		before.data,
		after.data,
		new Set(
			props.input.bricks?.flatMap((brick) =>
				brick.ref !== undefined && brick.before !== undefined && !brick.remove
					? [brick.ref]
					: [],
			),
		),
	);
	if (changes.length === 0) {
		return toolResult({
			output: {
				applied: false,
				note: "The document already had these values.",
			},
			summary: copy("admin:core.tools.lucid_builder_update.summary.unchanged"),
		});
	}

	const refs = await resolveContentRefs(context, {
		collection,
		content: { fields: content.fields, bricks: content.bricks },
	});
	if (refs.error) {
		return toolErrorFailure(
			context,
			refs.error,
			"server:agent.screen.response.invalid",
		);
	}

	const validationErrors = await builderValidation(context, {
		call: props,
		collection,
		content: after.data,
		documentId: screen.documentId,
		versionId: response.document.versionId,
	});

	return screenCall(context, {
		callId: props.call.id,
		title,
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
	});
};

export default builderUpdate;
