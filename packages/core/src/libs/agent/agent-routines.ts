import defineRoutine from "./define-routine.js";
import type { DefineRoutineOptions } from "./types.js";

/**
 * Ready-made routines to add to an agent's `routines`. Each one names the
 * tools it uses, which the agent needs in its `tools`.
 */
export const agentRoutines = {
	/**
	 * Keeps translations up to date: whenever documents are published, translates
	 * their missing and out-of-date machine translations into a request per
	 * locale for people to review, or straight into latest when the agent's
	 * translate tool saves directly. People's translations are left alone.
	 * @remarks Needs `agentTools.documents.translate()` (or `agentTools.edit()`) in the agent's tools. Doesn't run while AI translation is off. Saving directly needs confirmation, which routines refuse, so pass `toolSettings: { documents_translate: { requiresConfirmation: false } }` with `agentTools.documents.translate({ direct: true })`.
	 *
	 * @example
	 * ```ts
	 * defineAgent({
	 *   key: "translator",
	 *   name: "Translator",
	 *   tools: [agentTools.documents.translate()],
	 *   routines: [agentRoutines.translations({ collections: ["page"] })],
	 * });
	 * ```
	 */
	translations: (
		options: {
			/** Defaults to `translations`. */
			key?: string;
			/** Defaults to "Keep translations up to date". */
			name?: string;
			/** Only translates documents in these collections. Defaults to every collection. */
			collections?: [string, ...string[]];
			/** Only translates into these locales. Defaults to every locale but each collection's default. */
			locales?: [string, ...string[]];
			/** Per-tool confirmation overrides, as `defineRoutine` takes them. */
			toolSettings?: DefineRoutineOptions<string>["toolSettings"];
		} = {},
	) =>
		defineRoutine({
			key: options.key ?? "translations",
			name: options.name ?? "Keep translations up to date",
			instructions: `
				Documents were just published. Translate them with documents_translate, calling it once per collection with every published document from that collection${options.locales ? ` and locales ${JSON.stringify(options.locales)}` : ""}.
				Never set overwrite: translations people wrote must stay as they are.
				Skip documents that no longer exist. Don't change documents in any other way.
				Finish with one short line naming the requests you opened or documents you saved, and any fields that failed, or saying translations were already up to date.
			`,
			toolSettings: options.toolSettings,
			features: ["translation"],
			events: [
				{
					event: "documents:published",
					...(options.collections
						? { filter: { collections: options.collections } }
						: {}),
				},
			],
		}),
};
