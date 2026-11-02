import { copy } from "../../../../libs/i18n/index.js";
import type { ServiceContext } from "../../../../utils/services/types.js";
import formatTransferList from "../../../transfer/helpers/format-list.js";
import type { TransferDataLeftOut } from "./prepare-transfer-data.js";

/** Describes what fitting an import left out, with paths relative to the document's fields and bricks. */
const formatLeftOut = (
	context: ServiceContext,
	leftOut: TransferDataLeftOut,
) => {
	const paths = (values: string[]) =>
		formatTransferList(
			context,
			values.map((path) =>
				path.replace(/^fields\./, "").replace(/^bricks\.\w+\./, ""),
			),
		);

	const warnings: string[] = [];
	if (leftOut.unknown.length > 0) {
		warnings.push(
			context.translate(
				copy("server:core.transfer.documents.left.out.unknown", {
					data: { paths: paths(leftOut.unknown) },
				}),
			),
		);
	}
	if (leftOut.restricted.length > 0) {
		warnings.push(
			context.translate(
				copy("server:core.transfer.documents.left.out.restricted", {
					data: { paths: paths(leftOut.restricted) },
				}),
			),
		);
	}
	if (leftOut.locales.length > 0) {
		warnings.push(
			context.translate(
				copy("server:core.transfer.documents.left.out.locales", {
					data: { locales: formatTransferList(context, leftOut.locales) },
				}),
			),
		);
	}
	return warnings;
};

export default formatLeftOut;
