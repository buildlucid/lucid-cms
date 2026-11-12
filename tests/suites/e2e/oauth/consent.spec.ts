import { expect, type Page, requires, test } from "#harness/playwright";
import type { Lucid } from "#harness/playwright";
import { skipPasskeyPrompt, submitLogin } from "#shared/auth-pages";
import { STORY_KEY } from "#shared/collections/story";
import {
	createOAuthClient,
	createPkce,
	exchangeCode,
	OAUTH_PATHS,
	type OAuthClient,
	oauthResources,
	readCallback,
} from "#shared/oauth";

const READ_STORIES = `documents:${STORY_KEY}:read`;

/** The authorize address a client would send someone to, with its PKCE verifier. */
const authorizeUrl = async (lucid: Lucid, client: OAuthClient) => {
	const pkce = createPkce();
	const query = new URLSearchParams({
		client_id: client.clientId,
		redirect_uri: client.redirectUri,
		response_type: "code",
		resource: (await oauthResources(lucid)).content,
		scope: `${READ_STORIES} media:read`,
		state: "harness-browser-state",
		code_challenge: pkce.challenge,
		code_challenge_method: "S256",
	});
	return { url: `${OAUTH_PATHS.authorize}?${query}`, verifier: pkce.verifier };
};

/** Answers the client's callback in place of the client, and resolves with the address it got. */
const catchCallback = async (page: Page, client: OAuthClient) => {
	let resolve: (url: string) => void = () => {};
	const reached = new Promise<string>((done) => {
		resolve = done;
	});
	await page.route(`${client.redirectUri}**`, async (route) => {
		resolve(route.request().url());
		await route.fulfill({ body: "Back at the client." });
	});
	return reached;
};

test.describe("authorising an application", () => {
	requires("harness:outbox", `collection:${STORY_KEY}`);
	//* each test invites a person, which takes a while when every lane runs at once
	test.slow();

	test("a person allows it as themselves, and it gets only what they hold", async ({
		lucid,
		pageAs,
	}) => {
		const client = await createOAuthClient(await lucid.admin(), {
			name: "Browser Reader",
		});
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const page = await pageAs(person.session);
		const callback = catchCallback(page, client);
		const { url, verifier } = await authorizeUrl(lucid, client);

		await page.goto(url);
		await expect(
			page.getByRole("heading", { name: "Browser Reader wants to connect" }),
		).toBeVisible();
		//* the person can't connect for the whole site, so that choice isn't offered
		await expect(page.getByText("Connect as system")).toHaveCount(0);
		await expect(
			page.getByText("This requested scope is excluded from this connection."),
		).toBeVisible();
		await page.getByRole("button", { name: "Allow Connection" }).click();

		const back = readCallback(await callback);
		expect(back.state).toBe("harness-browser-state");
		const exchanged = await exchangeCode(lucid.session(), {
			client,
			code: back.code ?? "",
			verifier,
			resource: (await oauthResources(lucid)).content,
		});
		expect(exchanged.body.scope).toBe(READ_STORIES);
	});

	test("cancelling sends the person back with access denied", async ({
		lucid,
		pageAs,
	}) => {
		const client = await createOAuthClient(await lucid.admin());
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const page = await pageAs(person.session);
		const callback = catchCallback(page, client);

		await page.goto((await authorizeUrl(lucid, client)).url);
		await page.getByRole("button", { name: "Cancel" }).click();

		const back = readCallback(await callback);
		expect(back.error).toBe("access_denied");
		expect(back.code).toBeNull();
	});

	test("someone who can create integrations may connect it for the whole site", async ({
		lucid,
		pageAs,
	}) => {
		const client = await createOAuthClient(await lucid.admin());
		const person = await lucid.user({
			permissions: ["integrations:create", "integrations:read"],
		});
		const page = await pageAs(person.session);
		const callback = catchCallback(page, client);

		await page.goto((await authorizeUrl(lucid, client)).url);
		await page.getByText("Connect as system").click();
		await expect(
			page.getByText(
				"This connection continues independently of your account until it is revoked.",
			),
		).toBeVisible();
		await page.getByRole("button", { name: "Allow Connection" }).click();
		expect(readCallback(await callback).code).not.toBeNull();
		await page.waitForURL(`${client.redirectUri}**`);

		await page.goto("/admin/system/integrations");
		await expect(page.getByText(client.clientId).first()).toBeVisible();
	});

	test.describe("for a visitor who isn't signed in", () => {
		test.use({ storageState: { cookies: [], origins: [] } });

		test("signs them in first, then comes back to it", async ({
			lucid,
			page,
		}) => {
			const client = await createOAuthClient(await lucid.admin(), {
				name: "Signed Out App",
			});
			const person = await lucid.user({ permissions: [READ_STORIES] });

			await page.goto((await authorizeUrl(lucid, client)).url);
			await expect(page).toHaveURL(/\/admin\/login/);
			await submitLogin(page, person.credentials);
			await skipPasskeyPrompt(page);

			await expect(
				page.getByRole("heading", { name: "Signed Out App wants to connect" }),
			).toBeVisible();
		});
	});
});
