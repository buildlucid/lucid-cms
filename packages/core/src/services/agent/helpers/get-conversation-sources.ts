import z from "zod";
import { webSourceKey } from "../../../libs/agent/url-keys.js";
import type { AgentConversationSource } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { webFetchToolName } from "../../web/tools/fetch/index.js";
import { webSearchToolName } from "../../web/tools/search/index.js";
import scanMessages from "./scan-messages.js";

const sourceSchema = z.object({ url: z.string(), title: z.string().catch("") });
const searchOutputSchema = z.object({ results: z.array(sourceSchema) });

/**
 * Gathers every web source from a conversation's saved history, once per page.
 * Read pages come first, then pages only seen in search results, each in the
 * order they first appeared.
 */
const getConversationSources: ServiceFn<
	[{ conversationId: string }],
	AgentConversationSource[]
> = async (context, input) => {
	const sources = new Map<string, AgentConversationSource>();

	const add = (source: z.infer<typeof sourceSchema>, read: boolean) => {
		const key = webSourceKey(source.url);
		if (!key) return;

		const existing = sources.get(key);
		if (!existing) {
			sources.set(key, { ...source, read });
			return;
		}
		if (!existing.title) existing.title = source.title;
		if (read) existing.read = true;
	};

	const scanned = await scanMessages(context, {
		conversationId: input.conversationId,
		visit: (message) => {
			for (const part of message.parts) {
				if (part.type !== "tool" || part.status !== "complete") continue;
				if (part.name === webSearchToolName) {
					const output = searchOutputSchema.safeParse(part.output);
					for (const result of output.data?.results ?? []) add(result, false);
				} else if (part.name === webFetchToolName) {
					const output = sourceSchema.safeParse(part.output);
					if (output.success) add(output.data, true);
				}
			}
			return false;
		},
	});
	if (scanned.error) return scanned;

	const all = [...sources.values()];
	return {
		error: undefined,
		data: [
			...all.filter((source) => source.read),
			...all.filter((source) => !source.read),
		],
	};
};

export default getConversationSources;
