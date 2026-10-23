import { expect, test } from "vitest";
import {
	CLIENT_COMPONENT_ID_PATTERN,
	COMPONENT_STYLES_PATH,
	ELEMENT_ID,
	hydrationId,
} from "./hydration-ids.js";

test("matches the element and hydration module ids, and nothing else under the prefix", () => {
	expect(CLIENT_COMPONENT_ID_PATTERN.test(ELEMENT_ID)).toBe(true);
	expect(
		CLIENT_COMPONENT_ID_PATTERN.test(hydrationId("components/card.tsx")),
	).toBe(true);
	expect(
		CLIENT_COMPONENT_ID_PATTERN.test(`${COMPONENT_STYLES_PATH}card.tsx`),
	).toBe(false);
	expect(CLIENT_COMPONENT_ID_PATTERN.test("/@client-component/card.tsx")).toBe(
		false,
	);
});
