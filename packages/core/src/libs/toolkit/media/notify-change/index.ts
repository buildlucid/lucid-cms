import type z from "zod";
import notifyChange from "../../../../services/media/notify-change.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

export type ToolkitMediaNotifyChangeInput = z.input<typeof inputSchema>;

/** Reports changed IDs after direct writes, without running authoring hooks. */
const notify: ServiceFn<[ToolkitMediaNotifyChangeInput], undefined> = (
	context,
	input,
) =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: (data) => notifyChange(context, data),
		name: {
			key: "core.toolkit.media.notify.change.error.name",
			defaultMessage: "Change Notification Error",
		},
		message: {
			key: "core.toolkit.media.notify.change.error.message",
			defaultMessage: "Lucid could not report changed media.",
		},
	});

export default notify;
