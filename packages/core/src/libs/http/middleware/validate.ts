import type { ValidationTargets } from "hono";
import type { ZodType } from "zod";
import T from "../../../translations/index.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import { zValidator as zv } from "./z-validator.js";

const validate = <T extends ZodType, Target extends keyof ValidationTargets>(
	target: Target,
	schema: T,
) =>
	zv(target, schema, (result) => {
		if (!result.success) {
			throw new LucidAPIError({
				type: "validation",
				message: T("validation_error_message"),
				zod: result.error,
			});
		}
	});

export default validate;
