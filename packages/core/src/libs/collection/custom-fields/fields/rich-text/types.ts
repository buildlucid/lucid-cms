import type {
	MediaType,
	RichTextUserVariableField,
} from "../../../../../types/response.js";
import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { RefTargets } from "../../../../refs/types.js";
import type {
	CustomFieldUserAiConfig,
	FieldUIConfig,
	FieldValidation,
	SharedFieldConfig,
} from "../../types.js";
import type { MediaValidationData } from "../media/types.js";
import type { RelationValidationData } from "../relation/types.js";
import type { UserValidationData } from "../user/types.js";

export const richTextUserVariableFields = [
	"firstName",
	"lastName",
	"username",
	"email",
] as const satisfies readonly RichTextUserVariableField[];

export interface RichTextFieldConfig extends SharedFieldConfig {
	type: "rich-text";
	/** Copy shown beside the input in the admin. */
	details: {
		/** Field name shown to editors. */
		label?: AdminCopyInput;
		/** Help text explaining what to enter. */
		description?: AdminCopyInput;
		/** Hint shown while the input is empty. */
		placeholder?: AdminCopyInput;
	};
	/** Generation instructions and context for this field. */
	ai?: CustomFieldUserAiConfig<"rich-text">;
	/** Store a value per content locale when collection localization is enabled. Defaults to true. */
	localized?: boolean;
	/** Initial value for a new field. */
	default?: Record<string, unknown>;
	/** Create a database index for this field. */
	index?: boolean;
	/** Allowed references and editor appearance. */
	editor?: {
		/** Control external links and links to Lucid documents. */
		links?: {
			/** Allow links to external URLs. */
			external?: boolean;
			/** Allow document links, optionally restricted to collection keys. */
			internal?: boolean | string[];
		};
		/** Allow media insertion, optionally restricted to media categories. */
		media?: boolean | MediaType[];
		/** Allow document references, optionally restricted to collection keys. */
		documents?: boolean | string[];
		/** Allow embedded bricks registered on this collection, optionally restricted to brick keys. */
		bricks?: boolean | string[];
		/** Fields that editors may insert as dynamic values. */
		variables?: {
			/** Allow document variables, optionally restricted to collection keys. */
			document?: boolean | string[];
			/** User properties available as variables. */
			user?: RichTextUserVariableField[];
		};
		/** Use the standard editor border or a seamless presentation. */
		appearance?: "default" | "seamless";
		/** Allow editors to expand the editor to fullscreen. */
		fullscreen?: boolean;
	};
	/** Editor visibility and layout. */
	ui?: FieldUIConfig;
	/** Checks applied when saving field values. */
	validation?: FieldValidation<Record<string, unknown>>;
}

export type RichTextFieldProps = Partial<
	Omit<RichTextFieldConfig, "key" | "type">
>;

export type RichTextResValue = Record<string, unknown> | null;

export type RichTextValidationData = {
	/** Stored embedded identities may outlive their targets and remain editable. */
	retainedReferences?: RefTargets;
	media: MediaValidationData[];
	documents: RelationValidationData[];
	users: UserValidationData[];
	variableAccess?: {
		documentCollectionKeys: string[];
		users: boolean;
	};
	collections: Record<
		string,
		{
			fields: Array<{
				key: string;
				type: string;
				treeParent: string | null;
				structuralParent: string | null;
			}>;
		}
	>;
	embeddedBricks: Record<string, string>;
	cyclicEmbeddedBricks: string[];
};

export type RichTextCustomFieldMapItem = {
	props: RichTextFieldProps;
	config: RichTextFieldConfig;
	response: {
		value: RichTextResValue;
	};
};
