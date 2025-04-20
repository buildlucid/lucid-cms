import T from "../../../translations/index.js";
import type { FastifyRequest } from "fastify";
import z, { type ZodType } from "zod";
import { LucidAPIError } from "../../../utils/errors/index.js";

const validateBody = (schema: ZodType) => async (request: FastifyRequest) => {
	const bodySchema = z.object({
		body: schema ?? z.object({}),
	});
	const validateResult = await bodySchema.safeParseAsync({
		body: request.body || {},
	});

	if (!validateResult.success) {
		throw new LucidAPIError({
			type: "validation",
			message: T("validation_body_error_message"),
			zod: validateResult.error,
		});
	}

	request.body = validateResult.data.body;
};

export default validateBody;
