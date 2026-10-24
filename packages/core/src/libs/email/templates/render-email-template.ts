import type { ServiceFn } from "../../../utils/services/types.js";
import { copy } from "../../i18n/index.js";
import createEmailKiln from "./create-email-kiln.js";

type EmailKiln = ReturnType<typeof createEmailKiln>;

/** Kiln environments by template map and mode, so each config compiles its templates once per mode. */
const environments = {
	send: new WeakMap<Record<string, string>, EmailKiln>(),
	preview: new WeakMap<Record<string, string>, EmailKiln>(),
};

/** Renders `config.email.templates` with the data's `context` as a global, using lenient validation for previews with redacted or unstored values. */
const renderEmailTemplate: ServiceFn<
	[
		{
			template: string;
			data: Record<string, unknown> | null;
			preview?: boolean;
		},
	],
	string
> = async (context, data) => {
	const templates = context.config.email.templates;
	if (templates?.[data.template] === undefined) {
		return {
			error: {
				message: copy("server:core.email.templates.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const preview = data.preview ?? false;
	const cache = preview ? environments.preview : environments.send;
	let kiln = cache.get(templates);
	if (!kiln) {
		kiln = createEmailKiln(templates, { strict: !preview });
		cache.set(templates, kiln);
	}

	const { context: emailContext, ...props } = data.data ?? {};

	try {
		return {
			error: undefined,
			data: await kiln.render(data.template, props, {
				globals: emailContext === undefined ? {} : { context: emailContext },
			}),
		};
	} catch (error) {
		return {
			error: {
				message: copy.literal(
					error instanceof Error ? error.message : String(error),
				),
				status: 500,
			},
			data: undefined,
		};
	}
};

export default renderEmailTemplate;
