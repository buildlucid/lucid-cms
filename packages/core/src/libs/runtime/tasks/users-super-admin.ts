import z from "zod";
import grantSuperAdmin from "../../../services/users/cli/grant-super-admin.js";
import { LucidError } from "../../../utils/errors/index.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import createTaskServiceContext from "./create-task-service-context.js";
import defineRuntimeTask from "./define-runtime-task.js";

const usersSuperAdminTask = defineRuntimeTask({
	input: z.object({ email: z.string() }),
	run: async (context, input) => {
		const serviceContext = createTaskServiceContext(
			context,
			await context.connect(),
		);

		const result = await serviceWrapper(grantSuperAdmin, {
			transaction: true,
		})(serviceContext, { email: input.email });
		if (result.error) {
			throw new LucidError({
				message:
					serviceContext.translate.english(result.error.message) ??
					"Unknown error",
			});
		}
	},
});

export default usersSuperAdminTask;
