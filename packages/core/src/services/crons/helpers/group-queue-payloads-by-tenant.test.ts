import { describe, expect, test } from "vitest";
import groupQueuePayloadsByTenant from "./group-queue-payloads-by-tenant";

describe("groupQueuePayloadsByTenant", () => {
	test("groups payloads by normalized tenant keys", () => {
		const groups = groupQueuePayloadsByTenant([
			{
				payload: { id: 1 },
				tenantKeys: ["tenant-b", "tenant-a", "tenant-a"],
			},
			{
				payload: { id: 2 },
				tenantKeys: ["tenant-a", "tenant-b"],
			},
			{
				payload: { id: 3 },
				tenantKeys: [null, undefined],
			},
		]);

		expect(groups).toEqual([
			{
				tenantKeys: ["tenant-a", "tenant-b"],
				payloads: [{ id: 1 }, { id: 2 }],
			},
			{
				tenantKeys: [],
				payloads: [{ id: 3 }],
			},
		]);
	});
});
