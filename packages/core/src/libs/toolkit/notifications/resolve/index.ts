import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import type { AnyNotificationDefinition } from "../../../notifications/types.js";
import { runToolkitService } from "../../utils.js";
import { resolveSchema } from "../schema.js";
import type { ToolkitNotificationsResolveInput } from "../types.js";

const resolve = <Definition extends AnyNotificationDefinition>(
	context: ServiceContext,
	input: ToolkitNotificationsResolveInput<Definition>,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: resolveSchema,
		input,
		handler: async (data) => {
			const { default: resolveNotification } = await import(
				"../../../../services/notifications/resolve.js"
			);

			return resolveNotification(context, {
				definition: data.type,
				key: data.key,
			});
		},
		name: {
			key: "core.toolkit.notifications.resolve.error.name",
			defaultMessage: "Notifications Toolkit Error",
		},
		message: {
			key: "core.toolkit.notifications.resolve.error.message",
			defaultMessage: "Lucid toolkit could not resolve the notification.",
		},
	});

export default resolve;
