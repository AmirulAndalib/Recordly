import { describe, expect, it } from "vitest";
import { getWebcamShadowStrength } from "./shadowProfile";

describe("getWebcamShadowStrength", () => {
	it("doubles the webcam shadow response and clamps it", () => {
		expect(getWebcamShadowStrength(0)).toBe(0);
		expect(getWebcamShadowStrength(0.25)).toBe(0.5);
		expect(getWebcamShadowStrength(0.5)).toBe(1);
		expect(getWebcamShadowStrength(1)).toBe(1);
	});
});
