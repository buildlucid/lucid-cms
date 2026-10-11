import z from "zod";
import { controllerSchemas } from "../../../../schemas/review.js";

export const inputSchema = z.object({});

export const outputSchema = z.object({
	data: controllerSchemas.getOverview.response.meta({
		description:
			"collections lists each collection with environments: its document count, then per environment how many documents match latest (inSync), were published but are behind latest (outOfSync) and were never published there (unreleased). requests counts open requests by type: awaiting approval, approved, scheduled, failed, and assignedToMe for those waiting on the person you act for to approve.",
	}),
});
