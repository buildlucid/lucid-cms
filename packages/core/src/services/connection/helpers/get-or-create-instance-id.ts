import crypto from "node:crypto";
import { OptionsRepository } from "../../../libs/repositories/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";

const instanceIdSchema =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Returns the stable DCR installation identifier. */
const getOrCreateConnectionInstanceId = async (context: ServiceContext) => {
	const option = await new OptionsRepository(context.db).ensureTextValue({
		name: "instance_id",
		value: crypto.randomUUID(),
	});
	if (option.error) return option;
	if (
		!option.data.value_text ||
		!instanceIdSchema.test(option.data.value_text)
	) {
		return {
			error: {
				status: 500,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: option.data.value_text,
	};
};

export default getOrCreateConnectionInstanceId;
