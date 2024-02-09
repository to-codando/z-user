import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";

import { context, build } from "esbuild";
import copy from "esbuild-copy-files-plugin";
import aliasPlugin from "esbuild-plugin-path-alias";
import { buildEnvironment } from "./build.environment.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT;
const envMode = process.env.NODE_ENV;
const isProdMode = envMode === "production";
const isDevMode = envMode === "development";
const isCoverageMode = envMode === "coverage";

const getGlobFiles = async (directory, ignore = null) => {
	const files = await glob(directory, { ignore: ignore });
	return files;
};

const runBuild = async () => {
	const testFiles = await getGlobFiles(
		"./src/tests/**/*.spec.ts",
		"*/**/*.spec.md",
	);
	const components = await getGlobFiles("./src/components/**/*.ts");
	const mock = await getGlobFiles("./src/mock/**/*.ts");

	const configBuild = {
		plugins: [
			buildEnvironment({ environment: "development" }),
			aliasPlugin({
				"@/store": path.resolve(__dirname, "./src/store/index"),
				"@/components": path.resolve(__dirname, "./src/components/"),
				"@/services": path.resolve(__dirname, "./src/services"),
				"@/utils": path.resolve(__dirname, "./src/utils"),
				"@/assets": path.resolve(__dirname, "./src/assets"),
				"@/mock": path.resolve(__dirname, "./src/mock/"),
			}),
			copy({
				source: ["./src/index.html"],
				target: "./dist",
				copyWithFolder: false, // will copy "images" folder with all files inside
			}),
			copy({
				source: ["./src/assets"],
				target: "./dist",
				copyWithFolder: true, // will copy "images" folder with all files inside
			}),
		],
		supported: {
			"dynamic-import": true,
		},
		platform: "browser",
		format: "esm",
		bundle: true,
		write: true,
		entryPoints: [
			"src/main.ts",
			"src/assets/styles/main.css",
			...testFiles,
			...components,
			...mock,
		],
		tsconfig: isProdMode ? "./tsconfig.json" : "./tsconfig.spec.json",
		outdir: "./dist",
		external: ["http", "canvas", "global-jsdom", "global-jsdom/register"],
		treeShaking: isDevMode ? false : true,
		sourcemap: isDevMode || isCoverageMode ? true : false,
		minify: !isDevMode && !isCoverageMode ? true : false,
		target: !isDevMode && !isCoverageMode ? ["es2018"] : ["esnext"],
		loader: {
			".js": "ts",
			".png": "dataurl",
			".jpg": "file",
			".jpeg": "file",
			".svg": "text",
		},
	};

	console.log("=========>", process.env.NODE_ENV);

	if (!isDevMode || isCoverageMode) {
		try {
			await build(configBuild);
			console.log("Build is done!");
			process.exit(0);
		} catch (errors) {
			console.log(errors);
			process.exit(0);
		}
	}

	if (isDevMode) {
		try {
			const ctx = await context(configBuild);
			const { port } = await ctx.serve({ port: +PORT, servedir: "./dist" });
			ctx.watch();
			console.log(`server running in localhost:${port}`);
		} catch (errors) {
			console.log(errors);
			process.exit(0);
		}
	}
};

runBuild();
