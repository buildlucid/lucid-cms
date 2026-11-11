import { readdir } from "node:fs/promises";
import path from "node:path";
import type { OutboxEmail } from "../../../shared/fragments/outbox.ts";
import { readJson } from "../utils/json.ts";

const TIMEOUT_MS = 10_000;
const INTERVAL_MS = 100;

/** Which emails to look for: those sent to `to`, rendered from `template`. */
export type EmailMatch = { to: string; template: string };

/** Lists the matching emails in an outbox folder, oldest first. */
export const listEmails = async (
	outbox: string,
	match: EmailMatch,
): Promise<OutboxEmail[]> => {
	const files = await readdir(outbox).catch((): string[] => []);
	const emails: OutboxEmail[] = [];
	//* file names start with when they were written, so they sort oldest first
	for (const file of files.toSorted()) {
		const email = await readJson<OutboxEmail>(path.join(outbox, file)).catch(
			() => undefined,
		);
		if (email?.to === match.to && email.template === match.template) {
			emails.push(email);
		}
	}
	return emails;
};

/**
 * Returns the newest matching outbox email, waiting for asynchronous jobs. `after` requires more
 * than that many matching emails.
 */
const waitForEmail = async (
	outbox: string,
	match: EmailMatch & { after?: number },
): Promise<OutboxEmail> => {
	const deadline = performance.now() + TIMEOUT_MS;
	while (performance.now() < deadline) {
		const emails = await listEmails(outbox, match);
		const newest = emails.at(-1);
		if (newest && emails.length > (match.after ?? 0)) {
			return newest;
		}
		await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
	}
	throw new Error(
		`No "${match.template}" email reached ${match.to} within ${TIMEOUT_MS / 1000}s. Does the setup have harness:outbox?`,
	);
};

export default waitForEmail;
