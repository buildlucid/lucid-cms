import { serviceWrapper } from "@lucidcms/core";
import type { ServiceFn } from "@lucidcms/core/types";
import type {
	SeoIndexNowOptionsInternal,
	SeoPluginOptionsInternal,
} from "../parse-plugin-options.js";
import markChanges from "./mark-changes.js";
import sendPending from "./send-pending.js";

/**
 * Commits new, changed and removed URLs as pending, then sends all pending URLs. Failures remain
 * available for the next retry or manual send.
 */
const sendChanges: ServiceFn<
	[{ options: SeoPluginOptionsInternal; indexNow: SeoIndexNowOptionsInternal }],
	{ urlCount: number }
> = async (context, data) => {
	const markRes = await serviceWrapper(markChanges, { transaction: true })(
		context,
		{ options: data.options },
	);
	if (markRes.error) return markRes;

	return sendPending(context, {
		indexNow: data.indexNow,
		revision: markRes.data,
	});
};

export default sendChanges;
