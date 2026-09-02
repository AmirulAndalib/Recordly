import { describe, expect, it } from "vitest";
import { getUpdateToastWindowAppearance } from "./updateToastWindowOptions";

describe("update toast window appearance", () => {
	it("uses native transparency on macOS", () => {
		expect(getUpdateToastWindowAppearance("darwin")).toEqual({
			transparent: true,
			backgroundColor: "#00000000",
		});
	});

	it.each(["win32", "linux"] as const)("uses a visible opaque fallback on %s", (platform) => {
		expect(getUpdateToastWindowAppearance(platform)).toEqual({
			transparent: false,
			backgroundColor: "#101418",
		});
	});
});
