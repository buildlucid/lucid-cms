import z from "zod";
import resetTwoFactor from "../../../services/users/cli/reset-two-factor.js";
import { LucidError } from "../../../utils/errors/index.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import createTaskServiceContext from "./create-task-service-context.js";
import defineRuntimeTask from "./define-runtime-task.js";

const usersResetTwoFactorTask = defineRuntimeTask({
	input: z.object({ email: z.string() }),
	run: async (context, input) => {
		const serviceContext = createTaskServiceContext(
			context,
			await context.connect(),
		);

		const result = await serviceWrapper(resetTwoFactor, {
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

export default usersResetTwoFactorTask;
