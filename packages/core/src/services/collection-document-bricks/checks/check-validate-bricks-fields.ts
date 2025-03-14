import T from "../../../translations/index.js";
import logger from "../../../utils/logging/index.js";
import Repository from "../../../libs/repositories/index.js";
import type { FieldErrors } from "../../../types/errors.js";
import type { FieldTypes } from "../../../libs/custom-fields/types.js";
import type { FieldInsertItem } from "../helpers/flatten-fields.js";
import type BrickBuilder from "../../../libs/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import type {
	ServiceContext,
	ServiceFn,
} from "../../../utils/services/types.js";
import type { BrickInsertItem } from "../helpers/format-insert-bricks.js";

const checkValidateBricksFields: ServiceFn<
	[
		{
			bricks: Array<BrickInsertItem>;
			collection: CollectionBuilder;
		},
	],
	undefined
> = async (context, data) => {
	const flatFields =
		data.bricks.flatMap((brick) => {
			return brick.fields || [];
		}) || [];

	const [media, users, documents] = await Promise.all([
		getAllMedia(context, flatFields),
		getAllUsers(context, flatFields),
		getAllDocuments(context, flatFields),
	]);

	const errors: FieldErrors[] = [];
	for (let i = 0; i < data.bricks.length; i++) {
		const b = data.bricks[i];
		if (!b) continue;
		errors.push(
			...validateBrick({
				brick: b,
				collection: data.collection,
				data: {
					media: media,
					users: users,
					documents: documents,
				},
			}),
		);
	}

	if (errors.length) {
		return {
			error: {
				type: "basic",
				name: T("field_validation_error_name"),
				message: T("field_validation_error_message"),
				status: 400,
				errorResponse: {
					body: {
						fields: errors,
					},
				},
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export const validateBrick = (props: {
	brick: BrickInsertItem;
	collection: CollectionBuilder;
	data: {
		media: Awaited<ReturnType<typeof getAllMedia>>;
		users: Awaited<ReturnType<typeof getAllUsers>>;
		documents: Awaited<ReturnType<typeof getAllDocuments>>;
	};
}): FieldErrors[] => {
	const errors: FieldErrors[] = [];

	let instance = undefined;

	switch (props.brick.type) {
		case "collection-fields": {
			instance = props.collection;
			break;
		}
		case "builder": {
			instance = props.collection.config.bricks?.builder?.find(
				(b) => b.key === props.brick.key,
			);
			break;
		}
		case "fixed": {
			instance = props.collection.config.bricks?.fixed?.find(
				(b) => b.key === props.brick.key,
			);
			break;
		}
	}

	if (!instance) {
		logger("error", {
			message: T("error_saving_page_brick_couldnt_find_brick_config", {
				key: props.brick.key || "",
			}),
		});
		return errors;
	}

	for (let i = 0; i < props.brick.fields.length; i++) {
		const field = props.brick.fields[i];
		if (field === undefined) continue;

		const fieldRes = validateField({
			field: field,
			brickId: props.brick.id,
			instance: instance,
			data: props.data,
		});
		if (fieldRes === null) continue;
		errors.push(fieldRes);
	}

	return errors;
};
export const validateField = (props: {
	field: FieldInsertItem;
	brickId: number | string;
	instance: CollectionBuilder | BrickBuilder;
	data: {
		media: Awaited<ReturnType<typeof getAllMedia>>;
		users: Awaited<ReturnType<typeof getAllUsers>>;
		documents: Awaited<ReturnType<typeof getAllDocuments>>;
	};
}): FieldErrors | null => {
	const fieldInstance = props.instance.fields.get(props.field.key);
	if (!fieldInstance) {
		return {
			key: props.field.key,
			brickId: props.brickId,
			localeCode: props.field.localeCode,
			groupId: props.field.groupId,
			message: T("cannot_find_field_in_collection_or_brick"),
		};
	}

	let fieldValRes: {
		valid: boolean;
		message?: string;
	} = {
		valid: false,
		message: T("an_unknown_error_occurred_validating_the_field"),
	};

	switch (props.field.type) {
		case "media": {
			fieldValRes = fieldInstance.validate({
				type: props.field.type,
				value: props.field.value,
				relationData: props.data.media,
			});
			break;
		}
		case "user": {
			fieldValRes = fieldInstance.validate({
				type: props.field.type,
				value: props.field.value,
				relationData: props.data.users,
			});
			break;
		}
		case "document": {
			fieldValRes = fieldInstance.validate({
				type: props.field.type,
				value: props.field.value,
				relationData: props.data.documents,
			});
			break;
		}
		default: {
			fieldValRes = fieldInstance.validate({
				type: props.field.type,
				value: props.field.value,
				relationData: undefined,
			});
		}
	}
	if (fieldValRes.valid === true) return null;

	return {
		key: props.field.key,
		brickId: props.brickId,
		localeCode: props.field.localeCode,
		groupId: props.field.groupId,
		message:
			fieldValRes.message ||
			T("an_unknown_error_occurred_validating_the_field"),
	};
};

// -----------------------------------------------
// Helpers / Date Fetching
const allFieldIdsOfType = <T>(fields: FieldInsertItem[], type: FieldTypes) => {
	return fields
		.filter((field) => field.type === type)
		.map((field) => {
			return field.value as T;
		})
		.filter((value) => value !== undefined)
		.filter((value, index, self) => self.indexOf(value) === index);
};

const getAllMedia = async (
	context: ServiceContext,
	fields: FieldInsertItem[],
) => {
	try {
		const ids = allFieldIdsOfType<number>(fields, "media");
		if (ids.length === 0) return [];

		const Media = Repository.get("media", context.db, context.config.db);

		const mediaRes = await Media.selectMultiple({
			select: ["id", "file_extension", "width", "height", "type"],
			where: [
				{
					key: "id",
					operator: "in",
					value: ids,
				},
			],
			validation: {
				enabled: true,
			},
		});
		if (mediaRes.error) return [];

		return mediaRes.data;
	} catch (err) {
		return [];
	}
};
const getAllUsers = async (
	context: ServiceContext,
	fields: FieldInsertItem[],
) => {
	try {
		const ids = allFieldIdsOfType<number>(fields, "user");
		if (ids.length === 0) return [];

		const Users = Repository.get("users", context.db, context.config.db);

		const usersRes = await Users.selectMultiple({
			select: ["id"],
			where: [
				{
					key: "id",
					operator: "in",
					value: ids,
				},
			],
			validation: {
				enabled: true,
			},
		});
		if (usersRes.error) return [];

		return usersRes.data;
	} catch (err) {
		return [];
	}
};
const getAllDocuments = async (
	context: ServiceContext,
	fields: FieldInsertItem[],
) => {
	try {
		const ids = allFieldIdsOfType<number>(fields, "document");
		if (ids.length === 0) return [];

		const DocumentsRepo = Repository.get(
			"collection-documents",
			context.db,
			context.config.db,
		);

		return await DocumentsRepo.selectMultiple({
			select: ["id", "collection_key"],
			where: [
				{
					key: "id",
					operator: "in",
					value: ids,
				},
			],
		});
	} catch (err) {
		return [];
	}
};

export default checkValidateBricksFields;
