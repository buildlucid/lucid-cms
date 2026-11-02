import { copy } from "../../../libs/i18n/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";

const shown = 5;

/** Lists unique values for a message, eg. "title, body and 3 more". */
const formatTransferList = (context: ServiceContext, values: string[]) => {
	const unique = Array.from(new Set(values));
	const items = unique.slice(0, shown).join(", ");
	if (unique.length <= shown) return items;

	return context.translate(
		copy("server:core.transfer.list.more", {
			data: { items, count: unique.length - shown },
		}),
	);
};

export default formatTransferList;
