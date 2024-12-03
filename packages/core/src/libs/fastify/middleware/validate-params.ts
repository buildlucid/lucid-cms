import T from "../../../translations/index.js";
import type { FastifyRequest } from "fastify";
import z, { type ZodTypeAny } from "zod";
import { LucidAPIError } from "../../../utils/errors/index.js";

const validateParams =
	(schema: ZodTypeAny) => async (request: FastifyRequest) => {
		const bodySchema = z.object({
			params: schema ?? z.object({}),
		});
		const validateResult = await bodySchema.safeParseAsync({
			params: request.params,
		});

		if (!validateResult.success) {
			throw new LucidAPIError({
				type: "validation",
				message: T("validation_params_error_message"),
				zod: validateResult.error,
			});
		}

		request.params = validateResult.data.params;
	};

export default validateParams;
