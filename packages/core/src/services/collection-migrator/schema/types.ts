export type TableType =
	| "document"
	| "versions"
	| "document-fields"
	| "brick"
	| "repeater";

export type DataType =
	| "text"
	| "int"
	| "timestamp"
	| "integer"
	| "serial"
	| "float"
	| "varchar";

export type CollectionSchema = {
	key: string;
	tables: Array<{
		name: string;
		type: TableType;
		key: {
			collection: string;
			brick?: string;
			repeater?: string;
		};
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
