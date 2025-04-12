import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import executeHooks from "../../utils/hooks/execute-hooks.js";
import type { BrickSchema } from "../../schemas/collection-bricks.js";
import type { FieldSchemaType } from "../../schemas/collection-fields.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type {
	CollectionDocumentResponse,
	FieldResponse,
	BrickResponse,
} from "../../types.js";

const promoteVersion: ServiceFn<
	[
		{
			fromVersionId: number;
			toVersionType: "draft" | "published";
			collectionKey: string;
			documentId: number;
			userId: number;
			skipRevisionCheck?: boolean;
		},
	],
	undefined
> = async (context, data) => {
	// -------------------------------------------------------------------------------
	// Success
	return {
		error: undefined,
		data: undefined,
	};
};

export default promoteVersion;
