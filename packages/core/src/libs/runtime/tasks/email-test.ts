import z from "zod";
import sendTestEmail from "../../../services/email/cli/send-test.js";
import { LucidError } from "../../../utils/errors/index.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import isEmailSimulated from "../../email/is-simulated.js";
import { EmailTransactionsRepository } from "../../repositories/index.js";
import createTaskServiceContext from "./create-task-service-context.js";
import defineRuntimeTask from "./define-runtime-task.js";

/** Reports test email delivery after the inline queue finishes at commit. */
const emailTestTask = defineRuntimeTask({
	input: z.object({ to: z.email() }),
	run: async (context, input) => {
		const serviceContext = createTaskServiceContext(
			context,
			await context.connect(),
		);

		const sent = await serviceWrapper(sendTestEmail, {
			transaction: true,
		})(serviceContext, { to: input.to });
		if (sent.error) {
			throw new LucidError({
				message:
					serviceContext.translate.english(sent.error.message) ??
					"Unknown error",
			});
		}

		const EmailTransactions = new EmailTransactionsRepository(
			serviceContext.db,
		);
		const transaction = await EmailTransactions.selectSingle({
			select: ["delivery_status", "message"],
			where: [{ key: "email_id", operator: "=", value: sent.data.emailId }],
			validation: { enabled: true },
		});
		if (transaction.error) {
			throw new LucidError({
				message:
					serviceContext.translate.english(transaction.error.message) ??
					"Unknown error",
			});
		}

		return {
			adapter: serviceContext.email.key,
			simulated: isEmailSimulated(serviceContext),
			status: transaction.data.delivery_status,
			message: transaction.data.message,
		};
	},
});

export default emailTestTask;
