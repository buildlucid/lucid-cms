import { afterEach, describe, expect, test, vi } from "vitest";
import pageBuilderModalsStore from "./pageBuilderModalsStore";

describe("pageBuilderModalsStore embedded brick parent", () => {
	afterEach(() => pageBuilderModalsStore.reset());

	test("restores the brick editor after a nested picker completes", () => {
		pageBuilderModalsStore.open("embeddedBrickEdit", {
			data: { brickRef: "callout-ref" },
			onCallback: () => undefined,
		});
		const onSelect = vi.fn();
		pageBuilderModalsStore.open("documentSelect", {
			data: { collectionKeys: ["pages"] },
			onCallback: onSelect,
		});

		expect(pageBuilderModalsStore.getModal("embeddedBrickEdit")?.data).toEqual({
			brickRef: "callout-ref",
		});
		expect(pageBuilderModalsStore.isOpen("documentSelect")).toBe(true);

		const selection = { value: [], refs: [] };
		pageBuilderModalsStore.triggerAndClose("documentSelect", selection);
		pageBuilderModalsStore.close("documentSelect");

		expect(onSelect).toHaveBeenCalledWith(selection);
		expect(pageBuilderModalsStore.isOpen("documentSelect")).toBe(false);
		expect(pageBuilderModalsStore.isOpen("embeddedBrickEdit")).toBe(true);

		pageBuilderModalsStore.close("embeddedBrickEdit");
		expect(pageBuilderModalsStore.isOpen("embeddedBrickEdit")).toBe(false);
	});
});
