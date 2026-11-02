import { copy } from "../../../libs/i18n/index.js";
import type { TransferDefinition } from "../../../libs/transfer/types.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/** Describes links left out because this site doesn't have what they point to, eg. "Media (2), Users (1)". */
const formatMissingLinks = (
	context: ServiceContext,
	definitions: ReadonlyMap<string, TransferDefinition>,
	missing: ReadonlyMap<string, ReadonlySet<string>>,
) => {
	if (missing.size === 0) return [];

	const counts = Array.from(missing, ([resource, uids]) => {
		const label = definitions.get(resource)?.label;
		const name = label
			? context.translate(uids.size === 1 ? label.singular : label.plural)
			: resource;
		return `${name} (${uids.size})`;
	});
	return [
		context.translate(
			copy("server:core.transfer.import.links.missing", {
				data: { links: counts.join(", ") },
			}),
		),
	];
};

export default formatMissingLinks;
