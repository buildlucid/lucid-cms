import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import {
	fieldHooks,
	registeredFieldTypes,
} from "../../../libs/collection/custom-fields/registered-fields.js";
import type {
	CanLinkTarget,
	LinkTarget,
} from "../../../libs/collection/custom-fields/types.js";
import filterReadableContent from "../../../libs/collection/field-access/filter-readable-content.js";
import type { ContentAccess } from "../../../libs/collection/field-access/types.js";
import buildTableName from "../../../libs/collection/helpers/build-table-name.js";
import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { Permission } from "../../../libs/permission/types.js";
import type { LucidActor } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import readStoredContent from "../../documents-versions/helpers/read-stored-content.js";
import collectContentRefTargets from "../../documents/helpers/collect-content-ref-targets.js";
import type { ValidationData } from "./fetch-validation-data.js";

/**
 * Filters validation data for visible content through each field's `restrictValidationData` hook, so targets the actor can't read
 * validate as missing. Documents need collection read access, media needs media read access unless the actor uploaded it, and
 * emails need email read access. Targets the version's readable content already links stay.
 */
const restrictValidationData: ServiceFn<
	[
		{
			validationData: ValidationData;
			authUser: LucidActor;
			access: ContentAccess;
			collection: CollectionBuilder;
			existingVersion?: { id: number; documentId: number };
		},
	],
	ValidationData
> = async (context, data) => {
	if (data.authUser.superAdmin) {
		return { error: undefined, data: data.validationData };
	}

	const can = (permission: Permission) =>
		hasAccess({ user: data.authUser, requiredPermissions: [permission] });
	const canReadMedia =
		can(Permissions.MediaRead) || can(Permissions.MediaReadAll);
	const canReadEmails = can(Permissions.EmailRead);
	const readableDocumentTables = new Set(
		context.config.collections.flatMap((collection) => {
			if (!can(getCollectionPermission(collection.key, "read"))) return [];

			const table = buildTableName(
				"document",
				{ collection: collection.key },
				null,
			);
			return table.error ? [] : [table.data.name];
		}),
	);

	const canRead = (target: LinkTarget) => {
		switch (target.resource) {
			case "documents":
				return readableDocumentTables.has(target.table);
			case "media":
				return canReadMedia || target.createdBy === data.authUser.id;
			case "emails":
				return canReadEmails;
			default:
				return true;
		}
	};
	//* keys match the table names content targets are collected with
	const targetKey = (target: LinkTarget) => `${target.table}:${target.value}`;

	const restrict = (canLink: CanLinkTarget) =>
		//* each entry pairs a field type with its own hook's result, which the map can't express
		Object.fromEntries(
			registeredFieldTypes.flatMap((fieldType) => {
				const fieldData = data.validationData[fieldType];
				if (fieldData === undefined) return [];

				const restrictFieldData = fieldHooks[fieldType].restrictValidationData;
				return [
					[
						fieldType,
						restrictFieldData
							? restrictFieldData(fieldData, canLink)
							: fieldData,
					],
				];
			}),
		) as ValidationData;

	const unreadable = new Set<string>();
	const readable = restrict((target) => {
		if (canRead(target)) return true;

		unreadable.add(targetKey(target));
		return false;
	});
	//* the previous version is only read when something would otherwise be dropped
	if (unreadable.size === 0 || !data.existingVersion) {
		return { error: undefined, data: readable };
	}

	const storedRes = await readStoredContent(context, {
		collection: data.collection,
		documentId: data.existingVersion.documentId,
		versionId: data.existingVersion.id,
	});
	if (storedRes.error) return storedRes;
	if (!storedRes.data) return { error: undefined, data: readable };

	const stored = filterReadableContent(data.access, storedRes.data);
	const retained = new Set(
		collectContentRefTargets(data.collection, {
			fields: stored.fields ?? [],
			bricks: stored.bricks ?? [],
		}).map(targetKey),
	);

	return {
		error: undefined,
		data: restrict(
			(target) => canRead(target) || retained.has(targetKey(target)),
		),
	};
};

export default restrictValidationData;
