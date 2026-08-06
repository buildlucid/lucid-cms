import { z } from "@lucidcms/core";
import { defineTable } from "@lucidcms/core/plugin";

export type TestOrganisationTable = {
	name: string;
	createdAt: string | Date;
	updatedAt: string | Date;
};

export const testOrganisationsTable = defineTable<TestOrganisationTable>(
	"test-organisations",
	{
		columns: {
			name: { schema: z.string(), type: "text" },
			createdAt: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
			updatedAt: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	},
);
