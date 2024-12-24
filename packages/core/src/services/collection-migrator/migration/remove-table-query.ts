import type { ServiceFn } from "../../../types.js";
import type { TableMigration } from "./types.js";

const removeTableQuery: ServiceFn<
	[
		{
			migration: TableMigration;
		},
	],
	undefined
> = async (context, data) => {
	try {
		return {
			data: undefined,
			error: undefined,
		};
	} catch (err) {
		return {
			data: undefined,
			error: {
				message:
					err instanceof Error
						? err.message
						: "An error occurred while removing a collection table",
			},
		};
	}
};

export default removeTableQuery;
