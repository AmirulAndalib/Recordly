export function getUpdateToastWindowAppearance(platform: NodeJS.Platform) {
	const transparent = platform === "darwin";

	return {
		transparent,
		backgroundColor: transparent ? "#00000000" : "#101418",
	};
}
