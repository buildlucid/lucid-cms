import type { Collection, InternalDocumentField } from "@lucidcms/types";
import type { ReadonlyData } from "../../types/utils.js";

export type EditorFieldConfig = Exclude<
	Collection["fields"][number],
	{ type: "tab" | "section" | "collapsible" }
>;
export type EditorFieldValue = ReadonlyData<InternalDocumentField["value"]>;

/** Read-only field data in the current content locale. */
export type EditorFieldState = {
	readonly key: string;
	readonly config: ReadonlyData<EditorFieldConfig>;
	readonly errors: readonly string[];
	readonly readOnly: boolean;
} & (
	| {
			readonly type: "text" | "textarea" | "select" | "color" | "datetime";
			readonly value: string | undefined;
	  }
	| { readonly type: "number"; readonly value: number | null | undefined }
	| { readonly type: "checkbox"; readonly value: boolean | undefined }
	| {
			readonly type: "repeater";
			readonly groups: readonly {
				readonly ref: string;
				readonly fields: readonly EditorFieldState[];
			}[];
			readonly value?: never;
	  }
	| {
			readonly type: Exclude<
				EditorFieldConfig["type"],
				| "text"
				| "textarea"
				| "select"
				| "color"
				| "datetime"
				| "number"
				| "checkbox"
				| "repeater"
			>;
			readonly value: EditorFieldValue;
	  }
);

export type EditorContext = {
	readonly collectionKey: string | undefined;
	readonly documentId: number | undefined;
	readonly contentLocale: string;
	readonly readOnly: boolean;
};

export type FieldContext = EditorContext & {
	readonly brick:
		| {
				readonly key: string;
				readonly ref: string;
				readonly kind: "fixed" | "builder" | "embedded";
		  }
		| undefined;
	readonly groupRef: string | undefined;
	/** Reads a sibling in the current repeater item, or the root field scope. */
	getValue: (key: string) => EditorFieldValue;
};

export type BrickState = {
	readonly key: string;
	readonly ref: string;
	readonly kind: "fixed" | "builder" | "embedded";
	readonly config: ReadonlyData<Collection["fixedBricks"][number]>;
	readonly fields: readonly EditorFieldState[];
};
