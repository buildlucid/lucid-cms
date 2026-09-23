import { Permissions, usePermissions } from "@lucidcms/admin/hooks";
import { queries } from "@lucidcms/admin/services";
import { useQuery } from "@tanstack/solid-query";
import type { Accessor } from "solid-js";

/** Use Lucid's shared media cache and respect the editor's media permissions. */
export const useImage = (
	id: Accessor<number | undefined>,
	locale: Accessor<string>,
) => {
	const permissions = usePermissions();

	const query = useQuery(() => ({
		...queries.media.detail(id()),
		enabled: id() !== undefined && permissions.can(Permissions.MediaRead),
		retry: false,
	}));

	const image = () => {
		const media = query.data?.data;
		return media?.type === "image" ? media : undefined;
	};

	const alt = () => {
		const value = image()?.alt;
		return typeof value === "string" ? value : (value?.[locale()] ?? "");
	};

	return { query, image, alt };
};
