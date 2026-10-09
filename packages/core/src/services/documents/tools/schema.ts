import z from "zod";
import { requestTypeSchema } from "../../../libs/db/tables/requests.js";

export const writeInput = {
	collectionKey: z.string().min(1),
	contentLocale: z.string().min(1).optional().meta({
		description:
			"Content language the values are written in. Defaults to the collection's content language. Write each language in its own call.",
	}),
	fields: z.record(z.string(), z.unknown()).meta({
		description:
			"Field values by key, in the shape documents_get returns: plain values in contentLocale, rich text as HTML (spaces are kept as written, line breaks are formatting, so use <br> for one), media as lists of media library IDs (move personal uploads to the library first) and relations as lists of {id, collectionKey}. To write several languages at once, give a localized field an object keyed by language, eg. {en: 'Hello', fr: 'Bonjour'}; required localized fields need a value in every language when creating. Repeaters are lists of {ref?, fields}: keep an item's ref to change it, omit ref for a new item and leave an item out to remove it.",
	}),
	requestId: z.number().int().positive().optional().meta({
		description:
			"An open request to make the change in, eg. one returned by an earlier call. Defaults to this chat's open request for the document, or a new request.",
	}),
	request: z
		.object({
			title: z.string().trim().min(1).max(200).optional().meta({
				description: "A short title for reviewers. Defaults to a summary.",
			}),
			description: z.string().trim().min(1).max(10000).optional().meta({
				description:
					"Why the change is needed, for reviewers, as plain text or HTML.",
			}),
		})
		.optional()
		.meta({
			description: "Details for reviewers when a new request is opened.",
		}),
};

export const writeOutputSchema = z.object({
	outcome: z.enum(["applied", "requested"]).meta({
		description:
			"applied when the change was saved, or requested when it waits in a request for review and approval.",
	}),
	document: z
		.object({ collectionKey: z.string(), id: z.number() })
		.meta({ description: "The document changed or requested." }),
	request: z
		.object({ id: z.number(), type: requestTypeSchema })
		.nullable()
		.meta({
			description:
				"The request holding the change. Pass its ID as requestId to keep working in it.",
		}),
	links: z
		.object({ edit: z.string().optional(), request: z.string().optional() })
		.meta({ description: "Admin links to share with the person." }),
});
