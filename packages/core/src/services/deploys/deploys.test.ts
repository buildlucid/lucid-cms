import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { getDeployCallbackUrl } from "../../libs/deploys/callback.js";
import defineDeploy from "../../libs/deploys/define-deploy.js";
import createDeployTriggerHooks from "../../libs/deploys/trigger-hooks.js";
import type { DeployProviderInstance } from "../../libs/deploys/types.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import systemActor from "../../libs/permission/system-actor.js";
import type { LucidUser } from "../../types/hono.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import callback from "./callback.js";
import cancelRun from "./cancel-run.js";
import dispatchTriggers from "./dispatch-triggers.js";
import expireRuns from "./expire-runs.js";
import getMultiple from "./get-multiple.js";
import { startDeployRunJob } from "./jobs/start-run.js";
import { deployFailedNotification } from "./notifications/deploy-failed.js";
import { deploySucceededNotification } from "./notifications/deploy-succeeded.js";
import queueDeploy from "./queue.js";
import runDeploy from "./run.js";
import setState from "./set-state.js";

const testConfig = getTestConfig();
let context: ServiceContext;
afterAll(testConfig.destroy);

const trigger = vi.fn<DeployProviderInstance["trigger"]>();
const cancel = vi.fn<NonNullable<DeployProviderInstance["cancel"]>>();
const provider: DeployProviderInstance = {
	type: "deploy-provider",
	key: "test",
	trigger,
	cancel,
};
const production = defineDeploy({
	key: "production",
	name: "Production",
	provider,
	debounceSeconds: 60,
	maxWaitSeconds: 300,
	triggers: [
		{
			service: "documents",
			event: "afterChange",
			when: ({ meta, data }) => {
				if (meta.collectionKey === "broken") throw new Error("broken");
				return data.change?.type === "published";
			},
		},
	],
});

beforeAll(async () => {
	await testConfig.migrate();
	const config = await testConfig.getConfig();
	context = createServiceContext({
		config: {
			...config,
			deploys: [production],
			jobs: { definitions: [...config.jobs.definitions, startDeployRunJob] },
			notifications: {
				definitions: [
					...config.notifications.definitions,
					deployFailedNotification,
					deploySucceededNotification,
				],
			},
		},
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});

	//* someone to receive deploy notifications, as sends without recipients store nothing
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: "deploys@test.local",
			username: "deploys",
			secret: "test",
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	const role = await context.db.kysely
		.insertInto("lucid_roles")
		.values({ name: "deploys", description: null, key: null, locked: false })
		.returning("id")
		.executeTakeFirstOrThrow();
	await context.db.kysely
		.insertInto("lucid_user_roles")
		.values({ user_id: user.id, role_id: role.id })
		.execute();
	await context.db.kysely
		.insertInto("lucid_role_permissions")
		.values(
			(["deploys:production:read", "deploys:production:manage"] as const).map(
				(permission) => ({
					role_id: role.id,
					permission,
					core: true,
				}),
			),
		)
		.execute();
});

beforeEach(async () => {
	trigger.mockReset();
	cancel.mockReset();
	trigger.mockImplementation(async (_context, run) => ({
		status: "running",
		externalId: `external-${run.id}`,
	}));
	await context.db.kysely.deleteFrom("lucid_deploy_triggers").execute();
	await context.db.kysely.deleteFrom("lucid_deploy_runs").execute();
	await context.db.kysely.deleteFrom("lucid_deploy_overrides").execute();
	await context.db.kysely.deleteFrom("lucid_notifications").execute();
});

const queue = () =>
	withTransaction(context, (context) =>
		queueDeploy(context, { key: "production" }),
	);
const run = () =>
	withTransaction(context, (context) =>
		runDeploy(context, { key: "production", source: "manual" }),
	);
const runs = () =>
	context.db.kysely
		.selectFrom("lucid_deploy_runs")
		.select(["id", "status", "trigger_count", "external_id"])
		.orderBy("id")
		.execute();
const report = (id: number, status: "succeeded" | "failed") =>
	withTransaction(context, (context) =>
		callback(context, {
			id,
			token:
				new URL(getDeployCallbackUrl(context, id)).searchParams.get("token") ??
				"",
			update: { status },
		}),
	);
const backdateTriggers = (seconds: number) =>
	context.db.kysely
		.updateTable("lucid_deploy_triggers")
		.set({ created_at: new Date(Date.now() - seconds * 1000).toISOString() })
		.execute();

test("triggers wait out the debounce, then start one run with every trigger", async () => {
	await queue();
	await queue();
	await queue();

	await dispatchTriggers(context);
	expect(await runs()).toEqual([]);

	await backdateTriggers(61);
	await dispatchTriggers(context);

	const [started] = await runs();
	expect(started).toMatchObject({
		status: "running",
		trigger_count: 3,
		external_id: `external-${started?.id}`,
	});
	expect(trigger).toHaveBeenCalledTimes(1);
	expect(trigger.mock.calls[0]?.[1]).toMatchObject({
		triggerCount: 3,
		callbackUrl: getDeployCallbackUrl(context, started?.id ?? 0),
	});
});

test("a steady stream of triggers still runs once the maximum wait passes", async () => {
	await queue();
	await backdateTriggers(301);
	await queue();

	await dispatchTriggers(context);

	expect(await runs()).toMatchObject([{ status: "running", trigger_count: 2 }]);
});

test("runs wait behind the active run, merge into one queued run and start when it finishes", async () => {
	const first = await run();
	await queue();
	const second = await run();
	const third = await run();

	expect(second.data?.id).not.toBe(first.data?.id);
	expect(third.data?.id).toBe(second.data?.id);
	expect(await runs()).toMatchObject([
		{ status: "running" },
		{ status: "queued", trigger_count: 1 },
	]);

	const firstId = first.data?.id ?? 0;
	const token = new URL(
		getDeployCallbackUrl(context, firstId),
	).searchParams.get("token");
	const rejected = await callback(context, {
		id: firstId,
		token: "0".repeat(64),
		update: { status: "succeeded" },
	});
	expect(rejected.error?.status).toBe(401);

	await withTransaction(context, (context) =>
		callback(context, {
			id: firstId,
			token: token ?? "",
			update: { status: "succeeded" },
		}),
	);

	expect(await runs()).toMatchObject([
		{ status: "succeeded" },
		{ status: "running" },
	]);
	expect(trigger).toHaveBeenCalledTimes(2);
});

test("turning a deploy off drops its waiting triggers and queued run", async () => {
	await run();
	await queue();
	await run();

	await withTransaction(context, (context) =>
		setState(context, { key: "production", enabled: false }),
	);

	expect(await runs()).toMatchObject([
		{ status: "running" },
		{ status: "cancelled" },
	]);
	expect(
		await context.db.kysely
			.selectFrom("lucid_deploy_triggers")
			.select("id")
			.execute(),
	).toEqual([]);
	expect((await run()).error?.status).toBe(409);

	await queue();
	await backdateTriggers(61);
	await dispatchTriggers(context);
	expect(await runs()).toHaveLength(2);
});

test("timed out runs free the deploy, and a late result still replaces the timeout", async () => {
	const first = await run();
	await run();
	await context.db.kysely
		.updateTable("lucid_deploy_runs")
		.set({ expires_at: new Date(Date.now() - 1000).toISOString() })
		.where("id", "=", first.data?.id ?? 0)
		.execute();

	await expireRuns(context);
	expect(await runs()).toMatchObject([
		{ status: "timed-out" },
		{ status: "running" },
	]);

	const firstId = first.data?.id ?? 0;
	await withTransaction(context, (context) =>
		callback(context, {
			id: firstId,
			token:
				new URL(getDeployCallbackUrl(context, firstId)).searchParams.get(
					"token",
				) ?? "",
			update: { status: "succeeded" },
		}),
	);
	expect(await runs()).toMatchObject([
		{ status: "succeeded" },
		{ status: "running" },
	]);
});

test("deploys list their latest finished runs, newest first", async () => {
	await context.db.kysely
		.insertInto("lucid_deploy_runs")
		.values(
			(["succeeded", "failed", "queued", "succeeded"] as const).map(
				(status) => ({
					deploy_key: "production",
					status,
					source: "manual",
					trigger_count: 0,
					started_by_user_id: null,
				}),
			),
		)
		.execute();

	const deploys = await getMultiple(context, { actor: systemActor });

	expect(
		deploys.data?.[0]?.recentRuns.map((run) => [run.id, run.status]),
	).toEqual(
		(await runs())
			.filter((run) => run.status !== "queued")
			.toReversed()
			.map((run) => [run.id, run.status]),
	);
	expect(deploys.data?.[0]?.queuedRun?.status).toBe("queued");
});

test("trigger hooks queue only when `when` allows it, and a throw counts as no", async () => {
	const [hook] = createDeployTriggerHooks([production]);
	const handler = hook?.handler as (props: unknown) => Promise<unknown>;
	const props = (collectionKey: string, type: "published" | "updated") => ({
		context,
		toolkit: {},
		meta: { collectionKey },
		data: { ids: [1], change: { type, version: "production" } },
	});

	await handler(props("page", "updated"));
	await handler(props("broken", "published"));
	await handler(props("page", "published"));

	expect(
		await context.db.kysely
			.selectFrom("lucid_deploy_triggers")
			.select("deploy_key")
			.execute(),
	).toEqual([{ deploy_key: "production" }]);
});

test("a late result for an older run leaves a newer run's failure notice open", async () => {
	const first = await run();
	await run();
	const firstId = first.data?.id ?? 0;
	await context.db.kysely
		.updateTable("lucid_deploy_runs")
		.set({ expires_at: new Date(Date.now() - 1000).toISOString() })
		.where("id", "=", firstId)
		.execute();
	await expireRuns(context);

	const [, second] = await runs();
	await report(second?.id ?? 0, "failed");
	await report(firstId, "succeeded");

	const notice = await context.db.kysely
		.selectFrom("lucid_notifications")
		.select("resolved_at")
		.where("type", "=", "deploys:failed")
		.orderBy("id", "desc")
		.executeTakeFirst();
	expect(notice?.resolved_at).toBeNull();
});

test("successful runs refresh one notice per deploy saying it's live and who started it", async () => {
	const first = await run();
	await report(first.data?.id ?? 0, "succeeded");
	const second = await run();
	await report(second.data?.id ?? 0, "succeeded");

	const notices = await context.db.kysely
		.selectFrom("lucid_notifications")
		.select(["type", "resolved_at", "body"])
		.execute();
	expect(notices).toMatchObject([
		{ type: "deploys:succeeded", resolved_at: null },
	]);
	expect(JSON.stringify(notices[0]?.body)).toMatch(
		/Started from the admin and took \d+s\./,
	);
});

test("cancelling drops a queued run, or stops a running one on the host and starts the next", async () => {
	const first = await run();
	await queue();
	const second = await run();
	const firstId = first.data?.id ?? 0;

	await cancelRun(context, { actor: systemActor, id: second.data?.id ?? 0 });
	expect(cancel).not.toHaveBeenCalled();
	expect(await runs()).toMatchObject([
		{ status: "running" },
		{ status: "cancelled" },
	]);

	await run();
	cancel.mockRejectedValueOnce(new Error("Already finished"));
	expect(
		(await cancelRun(context, { actor: systemActor, id: firstId })).error
			?.status,
	).toBe(502);
	expect((await runs())[0]).toMatchObject({ status: "running" });

	await cancelRun(context, { actor: systemActor, id: firstId });
	expect(cancel).toHaveBeenLastCalledWith(
		expect.anything(),
		expect.objectContaining({ id: firstId, externalId: `external-${firstId}` }),
	);
	expect(await runs()).toMatchObject([
		{ status: "cancelled" },
		{ status: "cancelled" },
		{ status: "running" },
	]);
});

test("people only see and manage the deploys their roles allow", async () => {
	const viewer: LucidUser = {
		id: 1,
		username: "viewer",
		email: "viewer@test.local",
		superAdmin: false,
		permissions: ["deploys:production:read"],
	};
	const first = await run();

	expect(
		(await getMultiple(context, { actor: viewer })).data?.map(
			(deploy) => deploy.key,
		),
	).toEqual(["production"]);
	expect(
		(await getMultiple(context, { actor: { ...viewer, permissions: [] } }))
			.data,
	).toEqual([]);
	expect(
		(await cancelRun(context, { actor: viewer, id: first.data?.id ?? 0 })).error
			?.status,
	).toBe(403);
});
