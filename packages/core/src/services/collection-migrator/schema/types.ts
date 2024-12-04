export type TableType =
	| "document"
	| "versions"
	| "fields"
	| "brick"
	| "repeater";

export type DataType =
	| "text"
	| "int"
	| "timestamp"
	| "serial"
	| "float"
	| "varchar";

export type CollectionSchema = {
	key: string;
	tables: Array<{
		name: string;
		type: TableType;
		columns: Array<{
			key: string;
			source: "core" | "field";
			dataType: DataType;
			nullable: boolean;
			defaultValue?: unknown;
			foreignKey?: {
				table: string;
				column: string;
				onDelete?: "CASCADE" | "SET NULL" | "RESTRICT";
				onUpdate?: "CASCADE" | "SET NULL" | "RESTRICT";
			};
			unique?: boolean;
			primary?: boolean;
		}>;
	}>;
};
