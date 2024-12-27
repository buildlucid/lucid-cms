import type { OnUpdate } from "@lucidcms/core/types";

const formatOnUpdate = (value: OnUpdate | undefined): OnUpdate => {
	return (value?.toLowerCase() as OnUpdate | undefined) ?? "no action";
};

export default formatOnUpdate;
