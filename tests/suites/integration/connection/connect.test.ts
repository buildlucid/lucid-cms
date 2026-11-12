import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import {
	AI_FEATURES,
	authorizeConnection,
	changeConnection,
	connectionStatus,
	connectLucid,
	describeConnection,
	readLedger,
} from "#shared/ai";

/** Disconnects the CMS, as tests in a file share one and may have connected it. */
const disconnect = async (admin: Session) => {
	const response = await admin.request({
		method: "DELETE",
		path: "/api/v1/connection",
	});
	expect(response.status).toBe(204);
};

describe("connecting to Lucid", () => {
	test("registers the CMS with Lucid's API and sends the admin to sign in there", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();

		const started = await admin.request<{ data: { authorizationUrl: string } }>(
			{
				method: "POST",
				path: "/api/v1/connection/connect",
			},
		);
		expect(started.status).toBe(200);

		//* the harness stands in for Lucid's API, so this never reaches Lucid's servers
		const signIn = new URL(started.body.data.authorizationUrl);
		expect(signIn.pathname).toBe("/oauth/authorize");
		expect(signIn.searchParams.get("client_id")).toBeTruthy();
		expect(signIn.searchParams.get("redirect_uri")).toBe(
			`${lucid.url}/api/v1/connection/callback`,
		);
	});

	test("connects once the admin approves, with the organisation's AI access", async ({
		lucid,
	}) => {
		const id = await connectLucid(lucid);

		const status = await connectionStatus(await lucid.admin());
		expect(status).toMatchObject({
			status: "connected",
			connection: { id, status: "active" },
			organisation: { name: "Harness" },
			errorKey: null,
		});
		expect(status.ai?.features.toSorted()).toEqual([...AI_FEATURES].sort());
	});

	describe("on its own CMS", () => {
		//* these change the connection, which served tests share
		requires("mode:host");

		test("stays disconnected when the admin refuses at Lucid", async ({
			lucid,
		}) => {
			const admin = await lucid.admin();
			await disconnect(admin);

			const sentTo = await authorizeConnection(admin, {
				deny: "access_denied",
			});
			expect(sentTo.pathname).toBe("/admin/system/operations");
			expect(sentTo.searchParams.get("result")).toBe("denied");
			expect(sentTo.searchParams.get("error")).toBe("authorization_denied");

			const status = await connectionStatus(admin);
			expect(status.status).not.toBe("connected");
			expect(status.errorKey).toBe("authorization_denied");
		});

		test("refuses a sign-in finished in another browser", async ({ lucid }) => {
			const admin = await lucid.admin();
			await disconnect(admin);
			const started = await admin.request<{
				data: { authorizationUrl: string };
			}>({ method: "POST", path: "/api/v1/connection/connect" });
			const approved = await fetch(started.body.data.authorizationUrl, {
				redirect: "manual",
			});
			const callback = new URL(approved.headers.get("location") ?? "");

			//* the same admin, signed in elsewhere, lacks the cookie the flow started with
			const elsewhere = lucid.session();
			const back = await elsewhere.fetch(
				`${callback.pathname}${callback.search}`,
				{ redirect: "manual" },
			);
			const sentTo = new URL(back.headers.get("location") ?? "", lucid.url);
			expect(sentTo.searchParams.get("error")).toBe("callback_browser_invalid");
			expect((await connectionStatus(admin)).status).not.toBe("connected");
		});

		test("uses a sign-in's callback only once", async ({ lucid }) => {
			const admin = await lucid.admin();
			await disconnect(admin);
			const started = await admin.request<{
				data: { authorizationUrl: string };
			}>({ method: "POST", path: "/api/v1/connection/connect" });
			const approved = await fetch(started.body.data.authorizationUrl, {
				redirect: "manual",
			});
			const callback = new URL(approved.headers.get("location") ?? "");
			const follow = async () =>
				new URL(
					(
						await admin.fetch(`${callback.pathname}${callback.search}`, {
							redirect: "manual",
						})
					).headers.get("location") ?? "",
					lucid.url,
				);

			expect((await follow()).searchParams.get("result")).toBe("connected");
			expect((await follow()).searchParams.get("error")).toBe(
				"callback_state_invalid",
			);
			expect((await connectionStatus(admin)).status).toBe("connected");
		});

		test("disconnects, revoking its grant at Lucid, and connects again as the same client", async ({
			lucid,
		}) => {
			const id = await connectLucid(lucid);
			const admin = await lucid.admin();

			await disconnect(admin);
			expect((await connectionStatus(admin)).status).toBe("disconnected");

			//* the registration is kept, so Lucid sees the same CMS come back
			expect(await connectLucid(lucid)).toBe(id);
		});

		test("shows the connection revoked once Lucid stops accepting it", async ({
			lucid,
		}) => {
			const id = await connectLucid(lucid);
			const admin = await lucid.admin();
			await changeConnection(lucid, id, { revoked: true });

			const verified = await admin.request<{ data: { status: string } }>({
				method: "POST",
				path: "/api/v1/connection/verify",
			});
			expect(verified.body.data.status).toBe("revoked");
			expect((await connectionStatus(admin)).status).toBe("revoked");

			//* connecting again starts a new grant
			await changeConnection(lucid, id, { revoked: false });
			expect(await connectLucid(lucid)).toBe(id);
		});

		test("renews its access token before it expires", async ({ lucid }) => {
			const id = await connectLucid(lucid);
			const admin = await lucid.admin();
			//* the CMS renews a token in its last minute, so a fresh grant's half minute token is due at once
			await changeConnection(lucid, id, { tokenLifetimeSeconds: 30 });
			await disconnect(admin);
			await connectLucid(lucid);
			const before = (await readLedger(lucid, id)).filter(
				(entry) => entry.kind === "call" && entry.path === "/v1/oauth/token",
			).length;

			const verified = await admin.request<{ data: { status: string } }>({
				method: "POST",
				path: "/api/v1/connection/verify",
			});
			expect(verified.body.data.status).toBe("connected");
			const refreshes = (await readLedger(lucid, id)).filter(
				(entry) =>
					entry.kind === "call" &&
					entry.path === "/v1/oauth/token" &&
					entry.status === 200,
			);
			expect(refreshes.length).toBe(before + 1);
			await changeConnection(lucid, id, { tokenLifetimeSeconds: 3_600 });
		});

		test("picks up the AI features the organisation allows when it checks again", async ({
			lucid,
		}) => {
			const id = await connectLucid(lucid);
			await changeConnection(lucid, id, { features: ["agent", "alt_text"] });

			const verified = await (
				await lucid.admin()
			).request<{
				data: { ai: { features: string[] } };
			}>({ method: "POST", path: "/api/v1/connection/verify" });
			expect(verified.body.data.ai.features).toEqual(["agent", "alt_text"]);
			expect((await describeConnection(lucid, id)).features).toEqual([
				"agent",
				"alt_text",
			]);
		});
	});
});
