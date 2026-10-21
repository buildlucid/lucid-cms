import type { StoredPage } from "./read-stored-page.js";

const inFlight = new Map<string, Promise<StoredPage>>();

/** Renders a missing stored page once per store key, with concurrent requests for it waiting on that render instead of starting their own. */
const coalesceRenders = (
	key: string,
	render: () => Promise<StoredPage>,
): Promise<StoredPage> => {
	const existing = inFlight.get(key);
	if (existing) return existing;

	const pending = render().finally(() => inFlight.delete(key));
	inFlight.set(key, pending);
	return pending;
};

export default coalesceRenders;
