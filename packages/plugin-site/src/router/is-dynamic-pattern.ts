/** Whether a router pattern has parameters, so a static build needs the page's `paths` export to render it. */
const isDynamicPattern = (pattern: string) => pattern.includes(":");

export default isDynamicPattern;
