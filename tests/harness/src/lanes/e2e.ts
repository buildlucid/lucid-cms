import createPlaywrightLane from "./playwright/create-playwright-lane.ts";

const e2eLane = createPlaywrightLane({
	key: "e2e",
	description: "The admin interface driven through a real browser.",
});

export default e2eLane;
