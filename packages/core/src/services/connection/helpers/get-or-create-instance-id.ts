import crypto from "node:crypto";
import { OptionsRepository } from "../../../libs/repositories/index.js";
import type { LucidRemoteConnectionRow } from "../../../libs/repositories/lucid-remote-connections.js";
import type {
	InstanceIdOptionName,
	TenantScopedInstanceIdOptionName,
} from "../../../schemas/options.js";
import { multiTenancyEnabled } from "../../../utils/helpers/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";

const instanceIdSchema =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Returns the stable DCR installation identifier for a connection row,
 * inheriting the global option whenever that row is the shared fallback.
 */
const getOrCreateConnectionInstanceId = async (
	context: ServiceContext,
	row: LucidRemoteConnectionRow,
) => {
	const optionName: InstanceIdOptionName | TenantScopedInstanceIdOptionName =
		multiTenancyEnabled(context.config) && row.tenant_key
			? `instance_id:t:${row.tenant_key}`
			: "instance_id";
	const option = await new OptionsRepository(
		context.db.client,
		context.config.db,
	).ensureTextValue({
		name: optionName,
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
