import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

export type ToolkitCaptchaRenderWidgetInput = z.input<typeof inputSchema>;

const renderWidget = async (
	context: ServiceContext,
	input: ToolkitCaptchaRenderWidgetInput,
): ServiceResponse<string | null> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: renderCaptchaWidget } =
				await import("../../../../services/captcha/render-widget.js");

			return renderCaptchaWidget(context, data);
		},
		name: {
			key: "core.toolkit.captcha.render-widget.error.name",
			defaultMessage: "Captcha Toolkit Error",
		},
		message: {
			key: "core.toolkit.captcha.render-widget.error.message",
			defaultMessage: "Lucid toolkit could not draw the captcha widget.",
		},
	});

export default renderWidget;
