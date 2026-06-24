import { type CollectionBuilder, copy, z } from "@lucidcms/core";
import type { WritableDraft } from "immer";
import constants from "../constants.js";
import type { CollectionConfig } from "../types/types.js";

const slugSlashMessage = 'Only use a slash when the slug is exactly "/".';
const slugSpaceMessage = "The slug cannot contain spaces.";
const slugFormatMessage =
	"The slug may only contain letters, numbers, underscores, and hyphens.";

const registerFields = (
	collection: WritableDraft<CollectionBuilder>,
	config: CollectionConfig,
) => {
	collection
		.addText(constants.fields.fullSlug.key, {
			details: {
				label: copy("admin:plugin.pages.fields.full.slug.label", {
					defaultMessage: "Full slug",
				}),
			},
			config: {
				localized: config.localized,
				hidden: !config.displayFullSlug,
				disabled: true,
			},
			ai: {
				enabled: false,
			},
			listing: config.displayFullSlug,
		})
		.addText(constants.fields.slug.key, {
			details: {
				label: copy("admin:plugin.pages.fields.slug.label", {
					defaultMessage: "Slug",
				}),
			},
			config: {
				localized: config.localized,
				hidden: false,
				disabled: false,
			},
			ai: {
				enabled: false,
			},
			validation: {
				required: true,
				zod: z.string().superRefine((value, ctx) => {
					if (value === "/") return;
					if (value.includes("/")) {
						ctx.addIssue({
							code: "custom",
							message: slugSlashMessage,
						});
						return;
					}
					if (/\s/.test(value)) {
						ctx.addIssue({
							code: "custom",
							message: slugSpaceMessage,
						});
						return;
					}
					if (/^[a-zA-Z0-9_-]+$/.test(value)) return;

					ctx.addIssue({
						code: "custom",
						message: slugFormatMessage,
					});
				}),
			},
			listing: true,
		})
		.addDocument(constants.fields.parentPage.key, {
			collection: collection.key,
			details: {
				label: copy("admin:plugin.pages.fields.parent.page.label", {
					defaultMessage: "Parent page",
				}),
			},
			config: {
				hidden: false,
				disabled: false,
				multiple: false,
			},
		});
};

export default registerFields;
