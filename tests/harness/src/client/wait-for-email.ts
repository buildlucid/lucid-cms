import { readdir } from "node:fs/promises";
import path from "node:path";
import type { OutboxEmail } from "../../../shared/fragments/outbox.ts";
import { readJson } from "../utils/json.ts";

const TIMEOUT_MS = 10_000;
const INTERVAL_MS = 100;

/**
 * Waits for an email in a setup's outbox, the newest one sent to `to` with `template`. Emails
 * are sent by jobs, so one may land a moment after the request that caused it.
 */
const waitForEmail = async (
	outbox: string,
	match: { to: string; template: string },
): Promise<OutboxEmail> => {
	const deadline = Date.now() + TIMEOUT_MS;
	while (Date.now() < deadline) {
		const files = await readdir(outbox).catch((): string[] => []);
		//* file names start with when they were written, so the newest sorts last
		for (const file of files.toSorted().reverse()) {
			const email = await readJson<OutboxEmail>(path.join(outbox, file)).catch(
				() => undefined,
			);
			if (email?.to === match.to && email.template === match.template) {
				return email;
			}
		}
		await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
	}
	throw new Error(
		`No "${match.template}" email reached ${match.to} within ${TIMEOUT_MS / 1000}s. Does the setup have harness:outbox?`,
	);
};

export default waitForEmail;
