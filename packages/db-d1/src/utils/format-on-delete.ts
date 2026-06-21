import type { OnDelete } from "@lucidcms/core/types";

const formatOnDelete = (value: OnDelete | undefined): OnDelete => {
	return (value?.toLowerCase() as OnDelete | undefined) ?? "no action";
};

export default formatOnDelete;
