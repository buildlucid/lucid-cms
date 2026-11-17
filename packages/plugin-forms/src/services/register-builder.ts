import { LucidError } from "@lucidcms/core";
import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import exportSubmissionsConfig from "../admin/components/ExportSubmissions/config.js";
import formMarkupConfig from "../admin/components/FormMarkup/config.js";
import { FORMS_COLLECTION_KEY, formFields, PLUGIN_KEY } from "../constants.js";
import builderRoutes from "../routes/builder.js";
import createFormsCollection from "./collections/create-forms-collection.js";
import formAfterRestoreHandler from "./hooks/form-after-restore-handler.js";
import formBeforeUpsertHandler from "./hooks/form-before-upsert-handler.js";
import formVersionPromoteHandler from "./hooks/form-version-promote-handler.js";
import type {
	FormsBuilderOptionsInternal,
	FormsPluginOptionsInternal,
} from "./parse-plugin-options.js";

/**
 * Adds the collection editors build forms in, its checks on saving, publishing and restoring,
 * the page its preview frames and the toolbar button that shows a form's markup. Forms that store submissions also get the export section in their sidebar.
 */
const registerBuilder = (
	draft: ResolvedLucidConfig,
	options: FormsPluginOptionsInternal,
	builder: FormsBuilderOptionsInternal,
) => {
	if (
		draft.collections.some(
			(collection) => collection.key === FORMS_COLLECTION_KEY,
		)
	) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `Collection key '${FORMS_COLLECTION_KEY}' is reserved for the forms plugin's builder. Rename the collection or set 'builder: false'.`,
		});
	}

	draft.collections.push(
		createFormsCollection(options, builder, {
			captcha: draft.captcha?.adapter !== undefined,
			url: draft.url,
		}),
	);
	draft.hooks.push(
		{
			service: "documents",
			event: "beforeUpsert",
			handler: formBeforeUpsertHandler(options),
		},
		{
			service: "documents",
			event: "afterVersionPromote",
			handler: formVersionPromoteHandler,
		},
		{
			service: "documents",
			event: "afterRestore",
			handler: formAfterRestoreHandler,
		},
	);
	draft.http.routes.push(...builderRoutes(options));
	draft.admin.slots.push(formMarkupConfig());
	if (options.submissions !== false) {
		draft.admin.slots.push(
			exportSubmissionsConfig(FORMS_COLLECTION_KEY, formFields.key),
		);
	}
};

export default registerBuilder;
