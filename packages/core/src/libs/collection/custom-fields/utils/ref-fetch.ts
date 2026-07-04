import type {
	DocumentVersionType,
	FieldTypes,
	LucidBrickTableName,
	ServiceFn,
} from "../../../../types.js";
import type { MediaPropsT } from "../../../formatters/media.js";
import type { UserPropT } from "../../../formatters/users.js";
import type { BrickQueryResponse } from "../../../repositories/document-bricks.js";
import type { CollectionSchemaTable } from "../../schema/types.js";

export type FieldRefRelation = {
	table: string;
	values: Set<unknown>;
};

export type FieldRefVersionTypeResolver = (input: {
	fieldType: FieldTypes;
	table: string;
	collectionKey?: string;
}) => Exclude<DocumentVersionType, "revision">;

export type FieldRefFetchInput = {
	relations: FieldRefRelation[];
	versionType: Exclude<DocumentVersionType, "revision">;
	resolveVersionType?: FieldRefVersionTypeResolver;
};

export type FieldRefFetchOutput = {
	rows: Array<MediaPropsT> | Array<UserPropT> | Array<BrickQueryResponse>;
	meta?: {
		relation?: {
			fieldsSchemaByCollection: Record<
				string,
				CollectionSchemaTable<LucidBrickTableName>
			>;
		};
	};
};

export type FieldRefFetchPlan<T extends FieldTypes = FieldTypes> = {
	fieldType: T;
	run: ServiceFn<[], FieldRefFetchOutput>;
};

export type FieldRefFetchPlanInput<T extends FieldTypes = FieldTypes> = {
	fieldType: T;
	relations: FieldRefRelation[];
	versionType: Exclude<DocumentVersionType, "revision">;
	resolveVersionType?: FieldRefVersionTypeResolver;
	fetchRefs: ServiceFn<[FieldRefFetchInput], FieldRefFetchOutput>;
};

export const createFieldRefFetchPlan = <T extends FieldTypes>(
	input: FieldRefFetchPlanInput<T>,
): FieldRefFetchPlan<T> | null => {
	if (input.relations.length === 0) return null;

	return {
		fieldType: input.fieldType,
		run: (context) =>
			input.fetchRefs(context, {
				relations: input.relations,
				versionType: input.versionType,
				resolveVersionType: input.resolveVersionType,
			}),
	};
};
