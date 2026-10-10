import { isDeepStrictEqual } from "node:util";
import z from "zod";
import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { getDocumentShape } from "../../../../libs/collection/helpers/get-document-shape.js";
import { copy } from "../../../../libs/i18n/index.js";
import { agentBuilderContentSchema } from "../../../../schemas/agent-screen.js";
import fromDocumentInput from "../../../documents/helpers/from-document-input.js";
import patchDocumentData from "../../../documents/helpers/patch-document-data.js";
import resolveContentLocale from "../../../documents/helpers/resolve-content-locale.js";
import resolveContentRefs from "../../../documents/helpers/resolve-content-refs.js";
import toDocumentInput from "../../../documents/helpers/to-document-input.js";
import buildOperations from "../../../documents/tools/update/build-operations.js";
import { toolErrorFailure, toolFailure, toolResult } from "../tool-outcome.js";
import builderValidation from "./builder-validation.js";
import {
	resolveBuilderScreen,
	screenCall,
	screenUnavailable,
	takeScreenAnswer,
} from "./screen-call.js";
import type { RunnerToolInputHandler } from "./types.js";

const title = copy("admin:core.tools.lucid_builder_update.title");
//* what the update call handed the builder, so the result can report its validation errors
const appliedSchema = z.object({
	content: agentBuilderContentSchema,
	versionId: z.number().nullable(),
});

/** Reads the builder's unsaved content, then applies unsaved edits only if its revision still matches, leaving saving to the person. */
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
		const validationErrors = sent.success
			? await builderValidation(context, {
					call: props,
					collection,
					content: sent.data.content,
					documentId: screen.documentId,
					versionId: sent.data.versionId,
				})
			: [];

		return toolResult({
			output: {
				applied: true,
				validationErrors,
				note: validationErrors.length
					? "The changes are in the person's document builder as unsaved edits, but some fields aren't valid yet, so fix them before you finish. Paths name bricks by ref, or by key for fixed bricks."
					: "The changes are in the person's document builder as unsaved edits. They review and save them, and autosave waits until they do.",
			},
			summary: copy("admin:core.tools.lucid_builder_update.summary"),
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
	if (isDeepStrictEqual(patched.data, current.data)) {
		return toolResult({
			output: {
				applied: false,
				note: "The document already had these values.",
			},
			summary: copy("admin:core.tools.lucid_builder_update.summary.unchanged"),
		});
	}

	const content = toDocumentInput(
		contentContext,
		patched.data,
		response.document.content,
	);
	if (content.error) {
		return toolErrorFailure(
			context,
			content.error,
			"server:agent.screen.response.invalid",
		);
	}

	const refs = await resolveContentRefs(context, {
		collection,
		content: content.data,
	});
	if (refs.error) {
		return toolErrorFailure(
			context,
			refs.error,
			"server:agent.screen.response.invalid",
		);
	}

	return screenCall(context, {
		callId: props.call.id,
		title,
		call: {
			action: "update",
			screen,
			revision: response.document.revision,
			versionId: response.document.versionId,
			content: content.data,
			refs: refs.data,
		},
	});
};

export default builderUpdate;
