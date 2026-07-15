import type { CollectionDocumentStatus } from "../../../types.js";

export type ClientDocumentTarget<TCollectionKey extends string = string> =
	| {
			type: "version";
			versionType: CollectionDocumentStatus<TCollectionKey>;
			versionId?: number;
	  }
	| {
			type: "preview";
			token: string;
	  };
