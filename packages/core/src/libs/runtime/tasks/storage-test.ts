import z from "zod";
import testStorage from "../../../services/media/cli/test-storage.js";
import { LucidError } from "../../../utils/errors/index.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import createTaskServiceContext from "./create-task-service-context.js";
import defineRuntimeTask from "./define-runtime-task.js";

const storageTestTask = defineRuntimeTask({
	input: z.object({}),
	run: async (context) => {
		const serviceContext = createTaskServiceContext(
			context,
			await context.connect(),
		);

		const result = await serviceWrapper(testStorage, {
			transaction: false,
		})(serviceContext);
		if (result.error) {
			throw new LucidError({
				message:
					serviceContext.translate.english(result.error.message) ??
					"Unknown error",
			});
		}

		return result.data;
	},
});

export default storageTestTask;
