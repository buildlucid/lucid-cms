import { defineTable, z } from "@lucidcms/core";

export type TestOrganisationTable = {
	name: string;
	createdAt: string | Date;
	updatedAt: string | Date;
};

const testOrganisationsTable = defineTable<TestOrganisationTable>(
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

export default testOrganisationsTable;
