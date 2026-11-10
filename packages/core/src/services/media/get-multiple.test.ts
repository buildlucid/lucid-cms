import { randomUUID } from "node:crypto";
import { afterAll, assert, beforeAll, expect, test } from "vitest";
import { Permissions } from "../../libs/permission/definitions.js";
import {
	MediaRepository,
	UsersRepository,
} from "../../libs/repositories/index.js";
import type { GetMultipleQueryParams } from "../../schemas/media.js";
import type { LucidUser } from "../../types/hono.js";
import type { MediaActor } from "../../utils/media/index.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import getMultiple from "./get-multiple.js";
import getSingle from "./get-single.js";

const fixture = getTestConfig();
let context: ServiceContext;

beforeAll(async () => {
	context = createServiceContext({
		config: await fixture.getConfig(),
		database: await fixture.getDatabase(),
	});
	await fixture.migrate();
});
afterAll(() => fixture.destroy());

const createUser = async (permissions: string[]): Promise<LucidUser> => {
	const Users = new UsersRepository(context.db);
	const result = await Users.createSingle({
		data: {
			email: `${randomUUID()}@example.test`,
			username: randomUUID(),
			secret: "test",
		},
		returning: ["id", "username", "email"],
		validation: { enabled: true },
	});
	assert(result.data, JSON.stringify(result.error));
	return {
		...result.data,
		superAdmin: false,
		permissions: permissions as LucidUser["permissions"],
	};
};

const createMedia = async (
	ownership: { owner_user_id?: number; is_system?: boolean } = {},
) => {
	const Media = new MediaRepository(context.db);
	const result = await Media.createSingle({
		data: {
			key: `private/${randomUUID()}`,
			uid: randomUUID(),
			storage_adapter_key: "test",
			origin: "human",
			type: "document",
			mime_type: "application/pdf",
			file_extension: "pdf",
			file_size: 1,
			public: false,
			...ownership,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	assert(result.data, JSON.stringify(result.error));
	return result.data.id;
};

test("lists library media by default, and personal or system media only for those who can see it", async () => {
	const owner = await createUser([Permissions.MediaRead]);
	const other = await createUser([Permissions.MediaRead]);
	const auditor = await createUser([Permissions.MediaReadAll]);
	const media = {
		library: await createMedia(),
		upload: await createMedia({ owner_user_id: owner.id }),
		otherUpload: await createMedia({ owner_user_id: other.id }),
		logo: await createMedia({ is_system: true }),
	};

	const ids = async (
		actor: MediaActor,
		filter: GetMultipleQueryParams["filter"] = {},
	) => {
		const result = await getMultiple(context, {
			actor,
			query: {
				filter: {
					...filter,
					id: { value: Object.values(media), operator: "in" },
				},
				page: 1,
				perPage: 10,
			},
		});
		assert(result.data, JSON.stringify(result.error));
		return result.data.data.map((item) => item.id).sort();
	};
	const everything = {
		ownership: { value: ["library", "user", "system"], operator: "in" },
	} as const;

	expect(await ids({ type: "user", user: owner })).toEqual([media.library]);
	expect(await ids({ type: "user", user: owner }, everything)).toEqual(
		[media.library, media.upload].sort(),
	);
	expect(
		await ids(
			{ type: "user", user: auditor },
			{ ...everything, ownerId: { value: [owner.id], operator: "in" } },
		),
	).toEqual([media.upload]);
	expect(
		await ids(
			{ type: "user", user: auditor },
			{ ownership: { value: "system", operator: "=" } },
		),
	).toEqual([media.logo]);
	expect(await ids({ type: "content" }, everything)).toEqual([media.library]);
});

test("content actors never reach binned media, whatever the filters ask for", async () => {
	const id = await createMedia();
	const Media = new MediaRepository(context.db);
	const binned = await Media.updateSingle({
		data: { is_deleted: true, is_deleted_at: new Date().toISOString() },
		where: [{ key: "id", operator: "=", value: id }],
	});
	expect(binned.error).toBeUndefined();

	const list = await getMultiple(context, {
		actor: { type: "content" },
		query: {
			filter: {
				id: { value: [id], operator: "in" },
				isDeleted: { value: true, operator: "=" },
			},
			page: 1,
			perPage: 10,
		},
	});
	assert(list.data, JSON.stringify(list.error));
	expect(list.data.data).toEqual([]);
	expect(
		(await getSingle(context, { id, actor: { type: "content" } })).error
			?.status,
	).toBe(404);
	expect(
		(await getSingle(context, { id, actor: { type: "internal" } })).error,
	).toBeUndefined();
});
