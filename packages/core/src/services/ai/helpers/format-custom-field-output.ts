import type CustomField from "../../../libs/collection/custom-fields/custom-field.js";
import type { FieldTypes } from "../../../libs/collection/custom-fields/types.js";
import { copy } from "../../../libs/i18n/index.js";
import type { ServiceResponse } from "../../../types.js";

/**
 * Lets the target custom field normalize AI output per locale before admin applies it.
 */
const formatCustomFieldOutput = (props: {
	field: CustomField<FieldTypes>;
	output: Record<string, unknown>;
}): Awaited<ServiceResponse<Record<string, unknown>>> => {
	try {
		const output: Record<string, unknown> = {};

		for (const [locale, value] of Object.entries(props.output)) {
			const valueRes = props.field.formatAiGeneratedValue(value);
			if (!valueRes.success) {
				return {
					error: {
						type: "basic",
						status: 502,
						message:
							valueRes.message ??
							copy("server:core.routes.ai.generate.error.message"),
					},
					data: undefined,
				};
			}

			output[locale] = valueRes.value;
		}

		return {
			error: undefined,
			data: output,
		};
	} catch {
		return {
			error: {
				type: "basic",
				status: 502,
				message: copy("server:core.routes.ai.generate.error.message"),
			},
			data: undefined,
		};
	}
};

export default formatCustomFieldOutput;
