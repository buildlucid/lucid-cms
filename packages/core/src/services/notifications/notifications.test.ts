import { randomUUID } from "node:crypto";
import { afterAll, assert, beforeAll, expect, test, vi } from "vitest";
import constants from "../../constants/constants.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import { consumeJob } from "../../libs/jobs/consume/index.js";
import { enqueueJob } from "../../libs/jobs/enqueue.js";
import { notifications } from "../../libs/notifications/lucid-notifications.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import { createTestQueueAdapter } from "../../utils/test-helpers/create-jobs-context.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import getMultiple from "./get-multiple.js";
import getPreferences from "./get-preferences.js";
import getSummary from "./get-summary.js";
import { sendNotificationEmailsJob } from "./jobs/send-emails.js";
import resolve from "./resolve.js";
import send from "./send.js";
import updateMultiple from "./update-multiple.js";
import updatePreferences from "./update-preferences.js";
import updateTypeSettings from "./update-type-settings.js";
import upsert from "./upsert.js";

const fixture = getTestConfig();
let context: ServiceContext;
let author: number;
let reviewer: number;
let bystander: number;
let editor: number;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: { ...config, email: { ...config.email, simulate: true } },
		database: await fixture.getDatabase(),
		queue: createTestQueueAdapter(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: { en: { admin: {}, server: {} } },
		}),
	});
	await fixture.migrate();

	const createUser = async () => {
		const user = await context.db.kysely
			.insertInto("lucid_users")
			.values({
				email: `${randomUUID()}@example.test`,
				username: randomUUID(),
				secret: "test",
				super_admin: true,
			})
			.returning(["id"])
			.executeTakeFirstOrThrow();
		return user.id;
	};
	author = await createUser();
	reviewer = await createUser();
	bystander = await createUser();
	editor = await createUser();
});
afterAll(async () => {
	await fixture.destroy();
});

const inbox = async (userId: number, status = "inbox") => {
	const listed = await getMultiple(context, {
		userId,
		query: { filter: { status: { value: status } }, page: 1, perPage: 50 },
	});
	assert(listed.data, JSON.stringify(listed.error));
	return listed.data.data;
};
const row = async (id: number) =>
	context.db.kysely
		.selectFrom("lucid_notifications")
		.select(["resolved_at", "fingerprint"])
		.where("id", "=", id)
		.executeTakeFirstOrThrow();
const emailState = (id: number) =>
	context.db.kysely
		.selectFrom("lucid_notification_recipients")
		.select(["user_id", "email_due_at", "email_id"])
		.where("notification_id", "=", id)
		.execute();
/** Runs the scheduled email job as if `minutesLater` minutes had passed. */
const sweep = async (minutesLater = 0) => {
	vi.useFakeTimers({ toFake: ["Date"] });
	try {
		vi.setSystemTime(Date.now() + minutesLater * 60_000);
		const enqueued = await enqueueJob(context, {
			job: sendNotificationEmailsJob,
			payload: null,
		});
		assert(enqueued.data, JSON.stringify(enqueued.error));
		expect(await consumeJob(context, { jobId: enqueued.data.jobId })).toEqual({
			type: "completed",
		});
	} finally {
		vi.useRealTimers();
	}
};
const reviewDelay = notifications.requests.reviewRequested.email.delayMinutes;
const sendReview = (requestId: number, key?: string) =>
	send(context, {
		definition: notifications.requests.reviewRequested,
		key,
		recipients: [reviewer, author],
		actorUserId: author,
		data: { requestId, title: "Spring launch" },
	});

test("a send reaches its recipients, never the actor, and a keyed resend is a no-op", async () => {
	const first = await sendReview(1, "request:1:review");
	assert(first.data?.id, JSON.stringify(first.error));
	const again = await sendReview(1, "request:1:review");
	expect(again.data?.id).toBe(first.data.id);

	const listed = await inbox(reviewer);
	expect(listed.map((notification) => notification.id)).toContain(
		first.data.id,
	);
	const notification = listed.find((entry) => entry.id === first.data.id);
	expect(notification?.title).toBe("Review requested: Spring launch");
	expect(notification?.actionRequired).toBe(true);
	expect(notification?.actor?.id).toBe(author);
	expect(notification?.readAt).toBeNull();
	expect(await inbox(author)).toEqual([]);
});

test("resolving clears the to-do and a later send reopens it unread", async () => {
	const first = await sendReview(2, "request:2:review");
	assert(first.data?.id);
	expect(
		(
			await updateMultiple(context, {
				userId: reviewer,
				ids: [first.data.id],
				read: true,
			})
		).error,
	).toBeUndefined();

	const resolved = await resolve(context, {
		definition: notifications.requests.reviewRequested,
		key: "request:2:review",
	});
	expect(resolved.error).toBeUndefined();
	expect((await row(first.data.id)).resolved_at).not.toBeNull();
	expect(
		(await inbox(reviewer, "attention")).map((entry) => entry.id),
	).not.toContain(first.data.id);

	const reopened = await sendReview(2, "request:2:review");
	expect(reopened.data?.id).toBe(first.data.id);
	const after = await row(first.data.id);
	expect(after.resolved_at).toBeNull();
	const listed = await inbox(reviewer, "unread");
	expect(listed.map((entry) => entry.id)).toContain(first.data.id);
});

test("an upsert refreshes content quietly and only re-notifies when the fingerprint changes", async () => {
	const key = "storage";
	const first = await upsert(context, {
		definition: notifications.storage,
		key,
		fingerprint: "80",
		data: {
			thresholdPercent: 80,
			percentUsed: 82,
			storageUsed: 820,
			storageLimit: 1000,
			storageRemaining: 180,
		},
	});
	assert(first.data?.id, JSON.stringify(first.error));
	expect(
		(
			await updateMultiple(context, {
				userId: reviewer,
				ids: [first.data.id],
				read: true,
			})
		).error,
	).toBeUndefined();

	const same = await upsert(context, {
		definition: notifications.storage,
		key,
		fingerprint: "80",
		data: {
			thresholdPercent: 80,
			percentUsed: 85,
			storageUsed: 850,
			storageLimit: 1000,
			storageRemaining: 150,
		},
	});
	expect(same.data?.id).toBe(first.data.id);
	const quiet = (await inbox(reviewer)).find(
		(entry) => entry.id === first.data.id,
	);
	expect(quiet?.title).toBe("Media storage is 85% full");
	expect(quiet?.readAt).not.toBeNull();

	const climbed = await upsert(context, {
		definition: notifications.storage,
		key,
		fingerprint: "90",
		data: {
			thresholdPercent: 90,
			percentUsed: 91,
			storageUsed: 910,
			storageLimit: 1000,
			storageRemaining: 90,
		},
	});
	expect(climbed.data?.id).toBe(first.data.id);
	const loud = (await inbox(reviewer)).find(
		(entry) => entry.id === first.data.id,
	);
	expect(loud?.readAt).toBeNull();
});

test("an upsert keeps the audience in step and emails people it adds", async () => {
	const key = "request:9:failed";
	const failed = (recipients: number[], fingerprint?: string) =>
		upsert(context, {
			definition: notifications.requests.failed,
			key,
			fingerprint,
			recipients,
			data: { requestId: 9, title: "Spring launch", message: "Timed out" },
		});
	const emailJobs = async (id: number) =>
		(
			await context.db.kysely
				.selectFrom("lucid_jobs")
				.select(["job_id", "payload"])
				.where("job_name", "=", "core:send-notification-emails")
				.execute()
		).filter((job) => job.payload?.notificationId === id);
	const recipients = (id: number) =>
		context.db.kysely
			.selectFrom("lucid_notification_recipients")
			.select(["user_id", "email_id"])
			.where("notification_id", "=", id)
			.execute();

	const first = await failed([reviewer], "job-1");
	assert(first.data?.id, JSON.stringify(first.error));
	const id = first.data.id;

	//* no fingerprint keeps the stored one, so adding someone stays quiet for everyone else
	expect((await failed([reviewer, bystander])).error).toBeUndefined();
	expect((await row(id)).fingerprint).toBe("job-1");
	const jobs = await emailJobs(id);
	expect(jobs).toHaveLength(2);
	for (const job of jobs) {
		expect(await consumeJob(context, { jobId: job.job_id })).toEqual({
			type: "completed",
		});
	}
	const emailed = await recipients(id);
	expect(emailed.map((recipient) => recipient.user_id).sort()).toEqual(
		[reviewer, bystander].sort(),
	);
	expect(emailed.every((recipient) => recipient.email_id !== null)).toBe(true);
	const emails = await context.db.kysely
		.selectFrom("lucid_emails")
		.select("id")
		.where(
			"id",
			"in",
			emailed.flatMap((recipient) =>
				recipient.email_id === null ? [] : [recipient.email_id],
			),
		)
		.execute();
	expect(emails).toHaveLength(2);

	//* people who leave the audience are dropped rather than told again
	expect((await failed([bystander], "job-2")).error).toBeUndefined();
	expect((await row(id)).fingerprint).toBe("job-2");
	expect((await recipients(id)).map((recipient) => recipient.user_id)).toEqual([
		bystander,
	]);
});

test("types missing from the config are refused", async () => {
	const unregistered = await send(context, {
		definition: { ...notifications.requests.commented, key: "test:unknown" },
		recipients: [reviewer],
		data: { requestId: 1, title: "Spring launch", excerpt: "Hello" },
	});
	expect(unregistered.error?.status).toBe(404);
});

test("turning a type off suppresses it, and required types stay on", async () => {
	const off = await updateTypeSettings(context, {
		type: notifications.requests.commented.key,
		enabled: false,
		email: false,
		roleIds: null,
		userId: author,
	});
	expect(off.error).toBeUndefined();
	const suppressed = await send(context, {
		definition: notifications.requests.commented,
		recipients: [reviewer],
		actorUserId: author,
		data: { requestId: 3, title: "Spring launch", excerpt: "Looks good" },
	});
	expect(suppressed.data).toEqual({ id: null });

	const forced = await updateTypeSettings(context, {
		type: notifications.storage.key,
		enabled: false,
		email: true,
		roleIds: null,
		userId: author,
	});
	expect(forced.error).toBeUndefined();
	const still = await upsert(context, {
		definition: notifications.storage,
		key: "storage-required",
		data: {
			thresholdPercent: 100,
			percentUsed: 100,
			storageUsed: 1000,
			storageLimit: 1000,
			storageRemaining: 0,
		},
	});
	expect(still.data?.id).toEqual(expect.any(Number));
});

test("delayed emails only reach people who haven't read the notification or opted out", async () => {
	const optOut = await updatePreferences(context, {
		userId: bystander,
		preferences: [
			{ type: notifications.requests.reviewRequested.key, email: false },
		],
	});
	expect(optOut.error).toBeUndefined();
	const preferences = await getPreferences(context, { userId: bystander });
	expect(
		preferences.data?.find(
			(entry) => entry.type === notifications.requests.reviewRequested.key,
		)?.email,
	).toBe(false);

	const sent = await send(context, {
		definition: notifications.requests.reviewRequested,
		key: "request:4:review",
		recipients: [reviewer, bystander, editor],
		actorUserId: author,
		data: { requestId: 4, title: "Spring launch" },
	});
	assert(sent.data?.id, JSON.stringify(sent.error));
	const id = sent.data.id;
	expect(
		(await updateMultiple(context, { userId: reviewer, ids: [id], read: true }))
			.error,
	).toBeUndefined();

	await sweep();
	expect(
		(await emailState(id)).every(
			(recipient) => recipient.email_due_at !== null,
		),
	).toBe(true);

	await sweep(reviewDelay + 1);
	const after = await emailState(id);
	expect(after.every((recipient) => recipient.email_due_at === null)).toBe(
		true,
	);
	expect(
		after.find((recipient) => recipient.user_id === editor)?.email_id,
	).toEqual(expect.any(Number));
	expect(
		after
			.filter((recipient) => recipient.user_id !== editor)
			.map((recipient) => recipient.email_id),
	).toEqual([null, null]);
});

test("nobody is emailed about a notification resolved before its email is due", async () => {
	const sent = await send(context, {
		definition: notifications.requests.reviewRequested,
		key: "request:5:review",
		recipients: [editor],
		actorUserId: author,
		data: { requestId: 5, title: "Spring launch" },
	});
	assert(sent.data?.id, JSON.stringify(sent.error));
	const resolved = await resolve(context, {
		definition: notifications.requests.reviewRequested,
		key: "request:5:review",
	});
	expect(resolved.error).toBeUndefined();

	await sweep(reviewDelay + 1);
	expect(await emailState(sent.data.id)).toEqual([
		{ user_id: editor, email_due_at: null, email_id: null },
	]);
});

test("a reopened notification is emailed again, unless it goes unsent past the expiry", async () => {
	const key = "request:6:review";
	const sendAgain = () =>
		send(context, {
			definition: notifications.requests.reviewRequested,
			key,
			recipients: [editor],
			actorUserId: author,
			data: { requestId: 6, title: "Spring launch" },
		});

	const sent = await sendAgain();
	assert(sent.data?.id, JSON.stringify(sent.error));
	const id = sent.data.id;
	await sweep(reviewDelay + 1);
	const [emailed] = await emailState(id);
	expect(emailed?.email_id).toEqual(expect.any(Number));

	expect(
		(
			await resolve(context, {
				definition: notifications.requests.reviewRequested,
				key,
			})
		).error,
	).toBeUndefined();
	expect((await sendAgain()).data?.id).toBe(id);
	expect((await emailState(id))[0]?.email_due_at).not.toBeNull();

	await sweep(constants.notifications.emailExpiryHours * 60 + reviewDelay + 1);
	expect(await emailState(id)).toEqual([
		{ user_id: editor, email_due_at: null, email_id: emailed?.email_id },
	]);
});

test("the summary counts unread and open to-dos, and mark all read clears them", async () => {
	const before = await getSummary(context, { userId: reviewer });
	assert(before.data);
	expect(before.data.unread).toBeGreaterThan(0);
	expect(before.data.actionRequired).toBeGreaterThan(0);

	expect(
		(await updateMultiple(context, { userId: reviewer, all: true, read: true }))
			.error,
	).toBeUndefined();
	const after = await getSummary(context, { userId: reviewer });
	expect(after.data?.unread).toBe(0);
	expect(after.data?.actionRequired).toBe(before.data.actionRequired);
});
