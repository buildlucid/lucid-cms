import { text } from "../../../libs/i18n/index.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

const checkDuplicateOrder = (
	bricks: Array<BrickInputSchema>,
): Awaited<ServiceResponse<undefined>> => {
	const builderOrders = bricks
		.filter((brick) => brick.type === "builder")
		.map((brick) => brick.order);

	const builderOrderDuplicates = builderOrders.filter(
		(order, index) => builderOrders.indexOf(order) !== index,
	);

	if (builderOrderDuplicates.length > 0) {
		return {
			error: {
				type: "basic",
				name: text.server("core.error.saving.bricks"),
				message: text.server("core.error.saving.page.duplicate.order", {
					data: {
						order: builderOrderDuplicates.join(", "),
					},
				}),
				status: 400,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default checkDuplicateOrder;
