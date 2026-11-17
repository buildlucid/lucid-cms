import type { AllHooks } from "@lucidcms/core/types";
import { describe, expect, test } from "vitest";
import {
	FORMS_COLLECTION_KEY,
	SUBMISSIONS_COLLECTION_KEY,
} from "./constants.js";
import forms from "./plugin.js";
import type { FormsPluginOptions } from "./types.js";

/** Runs the plugin's `configure` over the parts of a config draft it adds to. */
const configure = (options?: FormsPluginOptions) => {
	const draft = {
		url: "https://cms.example.com",
		collections: [] as Array<{ key: string }>,
		admin: { slots: [] as Array<{ key: string }> },
		migrations: [] as Array<{ name: string }>,
		jobs: [] as Array<{ key: string }>,
		notifications: [] as Array<{ key: string }>,
		http: { routes: [] as Array<{ path: string }> },
		hooks: [] as AllHooks[],
	};
	forms(options).configure?.(draft as never);
	return draft;
};

describe("forms plugin", () => {
	test("adds both collections, with the submissions' notification, job and table", () => {
		const draft = configure();

		expect(draft.collections.map((collection) => collection.key)).toEqual([
			FORMS_COLLECTION_KEY,
			SUBMISSIONS_COLLECTION_KEY,
		]);
		expect(draft.notifications.map((item) => item.key)).toEqual([
			"forms:submission-received",
		]);
		expect(draft.jobs.map((job) => job.key)).toEqual([
			"forms:prune-submissions",
		]);
		expect(draft.migrations).toHaveLength(1);
	});

	test("leaves out everything that needs the submissions collection without it", () => {
		const draft = configure({ submissions: false });

		expect(draft.collections.map((collection) => collection.key)).toEqual([
			FORMS_COLLECTION_KEY,
		]);
		//* the notification's audience is the collection's readers, so config checks refuse it alone
		expect(draft.notifications).toEqual([]);
		expect(draft.jobs).toEqual([]);
		expect(draft.migrations).toEqual([]);
		expect(draft.http.routes.map((route) => route.path)).toEqual([
			"/forms/:key",
			"/forms/:key/submit",
			"/api/v1/forms/preview",
			"/api/v1/forms/preview.js",
			"/api/v1/forms/markup",
		]);
	});

	test("only serves code-defined forms without the builder", () => {
		const draft = configure({ builder: false });

		expect(draft.collections.map((collection) => collection.key)).toEqual([
			SUBMISSIONS_COLLECTION_KEY,
		]);
		expect(draft.hooks.map((hook) => hook.event)).toEqual(["beforeDelete"]);
	});
});
