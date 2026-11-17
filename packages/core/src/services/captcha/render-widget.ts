import type { CaptchaWidgetSettings } from "../../libs/captcha/types.js";
import type { ServiceFn } from "../../utils/services/types.js";

const escapeAttribute = (value: string) =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll('"', "&quot;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");

/**
 * The HTML for the adapter's browser widget in a form: an element holding its settings, with the
 * widget's script inside when there is one. Null when no adapter is configured.
 */
const renderWidget: ServiceFn<
	[{ action: string; field: string }],
	string | null
> = async (context, data) => {
	if (!context.captcha) {
		return {
			error: undefined,
			data: null,
		};
	}

	const settings: CaptchaWidgetSettings = {
		...context.captcha.client,
		action: data.action,
		field: data.field,
	};
	//* `</script` would end the script early, and `<\/` means the same inside the strings it can appear in
	const script = context.captcha.browserWidget?.replace(
		/<\/(script)/gi,
		"<\\/$1",
	);

	return {
		error: undefined,
		data: `<div data-captcha="${escapeAttribute(context.captcha.key)}" data-captcha-settings="${escapeAttribute(JSON.stringify(settings))}">${script ? `<script>${script}</script>` : ""}</div>`,
	};
};

export default renderWidget;
