import isEmailSimulated from "../../../libs/email/is-simulated.js";
import { EmailTransactionsRepository } from "../../../libs/repositories/index.js";
import type { LucidAuth } from "../../../types/hono.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import sendTestEmail from "../../email/cli/send-test.js";
import type { DiagnosticCheckOutcome } from "./types.js";

/** Sends a test email to the signed-in user and reports its delivery status when it's known. */
const emailCheck: ServiceFn<
	[{ authUser: LucidAuth }],
	DiagnosticCheckOutcome
> = async (context, data) => {
	const adapter = context.email.key;

	//* commits before reading the status, so an inline queue has already tried to deliver it
	const sent = await serviceWrapper(sendTestEmail, { transaction: true })(
		context,
		{ to: data.authUser.email },
	);
	if (sent.error) {
		return {
			error: undefined,
			data: {
				adapter,
				steps: [
					{
						name: "send",
						error:
							context.translate(sent.error.message) ??
							context.translate("server:core.errors.default.message"),
					},
				],
			},
		};
	}

	const EmailTransactions = new EmailTransactionsRepository(context.db);
	const transaction = await EmailTransactions.selectSingle({
		select: ["delivery_status", "message"],
		where: [{ key: "email_id", operator: "=", value: sent.data.emailId }],
	});
	const status = transaction.data?.delivery_status;

	if (status === "failed") {
		return {
			error: undefined,
			data: {
				adapter,
				steps: [
					{
						name: "send",
						error:
							transaction.data?.message ??
							context.translate("server:core.diagnostics.checks.email.failed"),
					},
				],
			},
		};
	}

	const steps = [{ name: "send", error: null }];
	if (isEmailSimulated(context)) {
		return {
			error: undefined,
			data: {
				adapter,
				steps,
				message: context.translate(
					"server:core.diagnostics.checks.email.simulated",
				),
			},
		};
	}

	return {
		error: undefined,
		data: {
			adapter,
			steps,
			message: status
				? context.translate("server:core.diagnostics.checks.email.status", {
						data: { status },
					})
				: undefined,
		},
	};
};

export default emailCheck;
