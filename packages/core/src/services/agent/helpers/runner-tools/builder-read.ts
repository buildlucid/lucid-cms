import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { copy } from "../../../../libs/i18n/index.js";
import fromDocumentInput from "../../../documents/helpers/from-document-input.js";
import projectEditableDocument from "../../../documents/helpers/project-editable-document.js";
import resolveContentLocale from "../../../documents/helpers/resolve-content-locale.js";
import { toolErrorFailure, toolFailure, toolResult } from "../tool-outcome.js";
import builderValidation from "./builder-validation.js";
import {
	resolveBuilderScreen,
	screenCall,
	screenUnavailable,
	takeScreenAnswer,
} from "./screen-call.js";
import type { RunnerToolInputHandler } from "./types.js";

/** Reads the document the person has open, unsaved changes included, in the shape documents_get returns. */
const builderRead: RunnerToolInputHandler<
	typeof runnerTools.builderRead
> = async (context, props) => {
	const resolved = resolveBuilderScreen(context, props);
	if (resolved.error) return resolved.error;

	const { screen, collection } = resolved.data;
	const answered = takeScreenAnswer(props);
	if (!answered) {
		return screenCall(context, {
			callId: props.call.id,
			title: copy("admin:core.tools.lucid_builder_read.title"),
			call: { action: "read", screen },
		});
	}

	const { response } = answered;
	if (response.status === "unavailable") {
		return screenUnavailable(context, response);
	}
	if (!response.document) {
		return toolFailure(
			context.translate("server:agent.screen.response.invalid"),
		);
	}

	const contentContext = {
		collection,
		localization: context.config.localization,
	};
	const data = fromDocumentInput(contentContext, response.document.content);
	if (data.error) {
		return toolErrorFailure(
			context,
			data.error,
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

	const projected = projectEditableDocument(contentContext, {
		data: data.data,
		contentLocale: locale.data,
		fieldKeys: props.input.fieldKeys,
		includeBricks: true,
		bricksPage: props.input.bricksPage,
		bricksPerPage: props.input.bricksPerPage,
	});
	if (projected.error) {
		return toolErrorFailure(
			context,
			projected.error,
			"server:agent.screen.response.invalid",
		);
	}

	const validationErrors = await builderValidation(context, {
		call: props,
		collection,
		content: response.document.content,
		documentId: screen.documentId,
		versionId: response.document.versionId,
	});

	return toolResult({
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
	});
};

export default builderRead;
