import { copy, LucidError } from "@lucidcms/core";
import type { LucidHookDocuments } from "@lucidcms/core/types";
import {
	brickFields,
	FIELD_BRICK_PREFIX,
	FORMS_COLLECTION_KEY,
	formFields,
} from "../../constants.js";
import checkKeyUniqueness from "../forms/check-key-uniqueness.js";
import type { FormsPluginOptionsInternal } from "../parse-plugin-options.js";

/**
 * Checks a form editors built before it is saved: its key isn't a code-defined form's or another
 * form's, its field names don't repeat, and it stores submissions when it takes files, as files
 * need a submission to belong to.
 */
const formBeforeUpsertHandler =
	(
		options: FormsPluginOptionsInternal,
	): LucidHookDocuments<"beforeUpsert">["handler"] =>
	async ({ context, data, meta }) => {
		if (meta.collectionKey !== FORMS_COLLECTION_KEY) return;

		const fieldValue = (key: string): unknown =>
			data.fields?.find((item) => item.key === key)?.value;

		const key = fieldValue(formFields.key);
		if (typeof key === "string" && key.trim() !== "") {
			if (options.forms.some((form) => form.key === key.trim())) {
				const message = copy("server:plugin.forms.key.defined.in.code");
				throw new LucidError({
					type: "basic",
					status: 400,
					message,
					errors: {
						fields: [{ key: formFields.key, localeCode: null, message }],
					},
				});
			}

			const uniqueRes = await checkKeyUniqueness(context, {
				key: key.trim(),
				versionType: data.versionType,
				documentId: data.documentId,
				tables: meta.collectionTableNames,
			});
			if (uniqueRes.error) throw new LucidError(uniqueRes.error);
		}

		const names = new Set<string>();
		const bricks = (data.bricks ?? []).filter(
			(brick) =>
				brick.type === "builder" && brick.key.startsWith(FIELD_BRICK_PREFIX),
		);
		for (const brick of bricks) {
			const name = brick.fields?.find(
				(item) => item.key === brickFields.name,
			)?.value;
			if (typeof name !== "string" || name.trim() === "") continue;

			if (names.has(name.trim())) {
				const message = copy("server:plugin.forms.field.name.duplicate", {
					data: { name: name.trim() },
				});
				throw new LucidError({
					type: "basic",
					status: 400,
					message,
					errors: {
						bricks: [
							{
								ref: brick.ref,
								key: brick.key,
								order: brick.order,
								fields: [{ key: brickFields.name, localeCode: null, message }],
							},
						],
					},
				});
			}
			names.add(name.trim());
		}

		const takesFiles = bricks.some(
			(brick) =>
				options.fieldTypes.get(brick.key.slice(FIELD_BRICK_PREFIX.length))
					?.control === "file",
		);
		if (takesFiles && fieldValue(formFields.store) === false) {
			const message = copy("server:plugin.forms.files.need.storage");
			throw new LucidError({
				type: "basic",
				status: 400,
				message,
				errors: {
					fields: [{ key: formFields.store, localeCode: null, message }],
				},
			});
		}
	};

export default formBeforeUpsertHandler;
