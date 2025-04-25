import T from "../../../translations/index.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";

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
				name: T("error_saving_bricks"),
				message: T("error_saving_page_duplicate_order", {
					order: builderOrderDuplicates.join(", "),
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
