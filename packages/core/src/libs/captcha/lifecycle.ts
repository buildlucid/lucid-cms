import type { ResolvedLucidConfig } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import { createAdapterLifecycleContext } from "../runtime/adapter-lifecycle.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "../runtime/types.js";
import getCaptchaAdapter from "./get-adapter.js";
import getCaptchaForms from "./get-forms.js";
import type { CaptchaAdapterInstance } from "./types.js";

/** Resolve or use a supplied captcha adapter and run its init hook. Protected forms need a widget slot for the adapter. */
export const getInitializedCaptchaAdapter = async (
	config: ResolvedLucidConfig,
	options: {
		adapter?: CaptchaAdapterInstance | null;
		env?: EnvironmentVariables;
		runtimeContext?: AdapterRuntimeContext;
	} = {},
): Promise<CaptchaAdapterInstance | null> => {
	const adapter = Object.hasOwn(options, "adapter")
		? (options.adapter ?? null)
		: await getCaptchaAdapter(config);
	if (!adapter) return null;

	const protectsForms = Object.values(getCaptchaForms(config.captcha)).some(
		(form) => form.enabled,
	);
	const hasWidget = config.admin.slots.some(
		(slot) =>
			slot.slot === "captcha.widget" &&
			(slot.match?.adapter === undefined || slot.match.adapter === adapter.key),
	);
	if (protectsForms && !hasWidget) {
		throw new LucidError({
			message: `No captcha.widget admin slot matches the "${adapter.key}" captcha adapter. Add the provider's plugin, or set captcha.forms to false for toolkit-only use.`,
		});
	}

	const context = createAdapterLifecycleContext({
		config,
		env: options.env,
		runtimeContext: options.runtimeContext,
	});

	try {
		await adapter.lifecycle?.init?.(context);
	} catch (error) {
		await Promise.allSettled([adapter.lifecycle?.destroy?.(context)]);
		throw error;
	}

	return adapter;
};

/** Run a captcha adapter destroy lifecycle hook when one exists. */
export const destroyCaptchaAdapter = async (
	adapter: CaptchaAdapterInstance | null | undefined,
	options: {
		config: ResolvedLucidConfig;
		env?: EnvironmentVariables;
		runtimeContext?: AdapterRuntimeContext;
	},
): Promise<void> => {
	if (!adapter) return;

	await adapter.lifecycle?.destroy?.(
		createAdapterLifecycleContext({
			config: options.config,
			env: options.env,
			runtimeContext: options.runtimeContext,
		}),
	);
};
