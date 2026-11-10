import { createRoot, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { expect, test } from "vitest";
import useScopedListState from "./useScopedListState";

const tick = () => Promise.resolve();

const setup = () =>
	createRoot((dispose) => {
		const [scope, setScope] = createSignal("a");
		const rows = { a: ["first"], b: ["second"] };
		const [query, setQuery] = createStore({
			data: rows.a as string[] | undefined,
			isLoading: false,
			isPlaceholderData: false,
			isSuccess: true,
		});
		const list = useScopedListState(query, scope);

		return { dispose, list, rows, setQuery, setScope };
	});

test("rows kept for a new page of the same record are stale", async () => {
	const { dispose, list, setQuery } = setup();
	await tick();

	setQuery({ isPlaceholderData: true });

	expect(list.stale()).toBe(true);
	expect(list.loading()).toBe(false);
	dispose();
});

test("rows kept from another record count as loading until its own arrive", async () => {
	const { dispose, list, rows, setQuery, setScope } = setup();
	await tick();

	//* the record changes a moment before the query catches up
	setScope("b");
	await tick();
	setQuery({ isPlaceholderData: true });

	expect(list.loading()).toBe(true);
	expect(list.stale()).toBe(false);

	setQuery({ data: rows.b, isPlaceholderData: false });
	await tick();
	setQuery({ isPlaceholderData: true });

	expect(list.loading()).toBe(false);
	expect(list.stale()).toBe(true);
	dispose();
});
