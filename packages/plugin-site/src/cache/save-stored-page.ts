import type { ServiceContext } from "@lucidcms/core/types";
import type { IslandManifest } from "@lucidkiln/core";
import { storeKeys } from "../constants.js";
import type { StoredPage } from "./read-stored-page.js";
import storeLifetime from "./store-lifetime.js";

/** Stores a rendered page with its island entries, which live as long as the page does. */
const saveStoredPage = async (props: {
	context: ServiceContext;
	key: string;
	page: StoredPage;
	islands: IslandManifest;
	revalidate: number | undefined;
}) => {
	const { context } = props;
	const ttlSeconds = storeLifetime(props.revalidate);
	await Promise.all([
		context.kv.set<StoredPage>(context, {
			key: props.key,
			value: props.page,
			hash: true,
			ttlSeconds,
		}),
		Object.keys(props.islands).length > 0
			? context.kv.setMany(context, {
					items: Object.entries(props.islands).map(([id, entry]) => ({
						key: storeKeys.island(id),
						value: entry,
					})),
					hash: true,
					ttlSeconds,
				})
			: undefined,
	]);
};

export default saveStoredPage;
