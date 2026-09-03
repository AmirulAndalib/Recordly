import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const windowsSource = readFileSync(fileURLToPath(new URL("./windows.ts", import.meta.url)), "utf8");
const mainSource = readFileSync(fileURLToPath(new URL("./main.ts", import.meta.url)), "utf8");
const recordingSource = readFileSync(
	fileURLToPath(new URL("./ipc/register/recording.ts", import.meta.url)),
	"utf8",
);

describe("HUD capture protection lifecycle", () => {
	it("applies protection without disabling Linux", () => {
		expect(windowsSource).not.toContain(
			"function isHudOverlayCaptureProtectionSupported(): boolean",
		);
		expect(windowsSource).toContain("hud.setContentProtection(enabled)");
		expect(windowsSource).toContain('win.on("show"');
	});

	it("reasserts protection at native and browser capture boundaries", () => {
		expect(recordingSource).toMatch(
			/"start-native-screen-recording"[\s\S]*?reassertHudOverlayCaptureProtection\(\)/,
		);
		expect(mainSource).toMatch(
			/setDisplayMediaRequestHandler[\s\S]*?reassertHudOverlayCaptureProtection\(\)/,
		);
	});
});
