import {
	describe,
	expect,
	type Session,
	test,
	useVariant,
} from "#harness/vitest";
import { sendLogin } from "#shared/auth";
import { CAPTCHA_TOKEN } from "#shared/fragments/auth";

useVariant("captcha");

const CAPTCHA_HEADER = "lucid-captcha-token";

type Form = {
	path: string;
	/** What the form sends, for an account that exists. */
	body: (email: string) => unknown;
};

/** The public forms a captcha guards by default, beside login. */
const FORMS: Record<string, Form> = {
	"magic link requests": {
		path: "/api/v1/auth/magic-link",
		body: (email) => ({ email }),
	},
	"password reset requests": {
		path: "/api/v1/account/reset-password",
		body: (email) => ({ email }),
	},
};

const submit = (session: Session, form: Form, email: string, token?: string) =>
	session.request({
		method: "POST",
		path: form.path,
		body: form.body(email),
		headers: token ? { [CAPTCHA_HEADER]: token } : undefined,
	});

describe("a captcha", () => {
	test("guards login, refusing a missing or failed token", async ({
		lucid,
	}) => {
		const { credentials } = await lucid.user();

		expect((await sendLogin(lucid.session(), credentials)).status).toBe(400);
		const failed = await sendLogin(lucid.session(), credentials, {
			[CAPTCHA_HEADER]: "not-a-pass",
		});
		expect(failed.status).toBe(403);
		const passed = await sendLogin(lucid.session(), credentials, {
			[CAPTCHA_HEADER]: CAPTCHA_TOKEN,
		});
		expect(passed.status).toBe(200);
	});

	test.for(Object.keys(FORMS))("guards %s", async (name, { lucid }) => {
		const form = FORMS[name] as Form;
		const { credentials } = await lucid.user();

		expect((await submit(lucid.session(), form, credentials.email)).ok).toBe(
			false,
		);
		expect(
			(await submit(lucid.session(), form, credentials.email, CAPTCHA_TOKEN))
				.ok,
		).toBe(true);
	});

	test("isn't asked of someone signed in, nor for accepting an invitation", async ({
		lucid,
	}) => {
		const user = await lucid.user();
		const reset = await submit(
			user.session,
			FORMS["password reset requests"] as Form,
			user.credentials.email,
		);
		expect(reset.ok).toBe(true);

		const { token, credentials } = await lucid.invite();
		const accepted = await lucid.session().request({
			method: "POST",
			path: `/api/v1/auth/invitation/accept/${token}`,
			body: {
				password: credentials.password,
				passwordConfirmation: credentials.password,
			},
		});
		expect(accepted.ok).toBe(true);
	});
});
