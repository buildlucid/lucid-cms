import type { AiGeneratedContent } from "@lucidcms/types";
import z from "zod";
import type { ServiceResponse } from "../../../exports/types.js";
import type CustomField from "../../../libs/collection/custom-fields/custom-field.js";
import type { FieldTypes } from "../../../libs/collection/custom-fields/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { generatedContentSchema } from "../../../libs/lucid-remote/schema/generated-content.js";

/**
 * Lets the target custom field normalize generated values before admin applies them.
 */
const formatCustomFieldOutput = (props: {
	field: CustomField<FieldTypes>;
	output: unknown;
	targetLocales: string[] | null;
}): Awaited<ServiceResponse<AiGeneratedContent<unknown>>> => {
	try {
		const parsed = generatedContentSchema(
			z.unknown(),
			props.targetLocales,
		).safeParse(props.output);

		if (!parsed.success)
			return {
				error: {
					type: "basic",
					status: 502,
					message: copy(
						"server:core.routes.ai.generate.invalid.output.message",
					),
				},
				data: undefined,
			};
		if (parsed.data.kind === "value") {
			const value = props.field.formatAiGeneratedValue(parsed.data.value);
			if (!value.success)
				return {
					error: {
						type: "basic",
						status: 502,
						message:
							value.message ??
							copy("server:core.routes.ai.generate.error.message"),
					},
					data: undefined,
				};
			return { error: undefined, data: { kind: "value", value: value.value } };
		}
		const output: Record<string, unknown> = {};

		for (const [locale, value] of Object.entries(parsed.data.translations)) {
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
			data: { kind: "translations", translations: output },
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
