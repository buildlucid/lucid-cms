import { describe, expect, requires, test } from "#harness/vitest";
import { CONTACT_FORM_KEY } from "#shared/config/fragments/forms";
import { contactAnswers, submitForm } from "#shared/helpers/forms";

describe("a form's rate limit", () => {
	//* the limit counts in the KV store, and counts nothing without one
	requires("plugin:forms", "plugin:sqlite-kv");

	test("refuses a visitor who sends more than the limit, and nobody else", async ({
		lucid,
	}) => {
		const visitor = lucid.session();
		const send = (session = visitor) =>
			submitForm(lucid, CONTACT_FORM_KEY, contactAnswers(), { session });

		const statuses: number[] = [];
		for (let sent = 0; sent < 6; sent++) {
			statuses.push((await send()).status);
		}

		expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
		expect((await send(lucid.session())).status).toBe(200);
	});
});
