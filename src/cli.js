#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const { processReplacementJob } = require("./core/processor");
const { loadRecipe, normalizeRecipe } = require("./core/recipe");

const packageJson = require("../package.json");

function showHelp() {
    console.log(`
Animate Asset Replacer v${packageJson.version}

Usage:
  animate-replacer <html> <recipe> [options]

Arguments:
  html
      Adobe Animate HTML file.

  recipe
      JSON recipe describing the image/audio replacements.

Options:
  --asset <id>=<file>
      Override the replacement file for an asset.

      May be specified multiple times.

      Example:
        --asset bg=new_bg.jpg
        --asset spinSfx=new_spin.mp3

  --output <file>
      Override the output HTML filename.

  --verbose
      Show detailed processing information.

  --help
      Show this help.

  --version
      Show the application version.

Examples:

  animate-replacer playable.html recipe.json

  animate-replacer playable.html recipe.json --verbose

  animate-replacer playable.html recipe.json \\
      --asset bg=new_bg.jpg \\
      --asset spinSfx=new_spin.mp3

  animate-replacer playable.html recipe.json \\
      --output playable_final.html
`);
}


function fail(message) {
    console.error(`Error: ${message}`);
    process.exit(1);
}


function parseArguments(argv) {

    const args = argv.slice(2);

    const result = {
        html: null,
        recipe: null,
        output: null,
        verbose: false,
        assets: {}
    };


    for (let i = 0; i < args.length; i++) {

        const arg = args[i];


        if (arg === "--help" || arg === "-h") {

            result.help = true;

        }

        else if (arg === "--version" || arg === "-v") {

            result.version = true;

        }

        else if (arg === "--verbose") {

            result.verbose = true;

        }

        else if (arg === "--output") {

            i++;

            if (i >= args.length)
                fail("--output requires a filename.");

            result.output = args[i];

        }

        else if (arg === "--asset") {

            i++;

            if (i >= args.length)
                fail("--asset requires id=file.");

            const value = args[i];

            const equals = value.indexOf("=");

            if (equals === -1)
                fail(`Invalid --asset value: ${value}`);

            const id = value.substring(0, equals);
            const file = value.substring(equals + 1);

            result.assets[id] = file;

        }

        else if (arg.startsWith("-")) {

            fail(`Unknown option: ${arg}`);

        }

        else if (!result.html) {

            result.html = arg;

        }

        else if (!result.recipe) {

            result.recipe = arg;

        }

        else {

            fail(`Unexpected argument: ${arg}`);

        }
    }


    return result;
}


async function main() {

    const args = parseArguments(process.argv);


    if (args.help) {

        showHelp();
        return;

    }


    if (args.version) {

        console.log(packageJson.version);
        return;

    }


    if (!args.html || !args.recipe) {

        showHelp();
        process.exit(1);

    }


    const htmlFile = path.resolve(args.html);
    const recipeFile = path.resolve(args.recipe);


    if (!fs.existsSync(htmlFile))
        fail(`HTML file not found: ${htmlFile}`);


    if (!fs.existsSync(recipeFile))
        fail(`Recipe file not found: ${recipeFile}`);


    /*
        Load the recipe so that we can map CLI asset
        overrides to replacement indexes.
    */

    const recipe = normalizeRecipe(
        loadRecipe(recipeFile)
    );


    const replacements = recipe.replacements;

    const replacementOverrides = replacements.map(
        replacement => {

            const override =
                args.assets[replacement.asset_id];

            if (!override)
                return null;

            return path.resolve(override);
        }
    );


    if (args.verbose) {

        console.log("");
        console.log("Animate Asset Replacer");
        console.log("----------------------");

        console.log(`HTML:   ${htmlFile}`);
        console.log(`Recipe: ${recipeFile}`);

        console.log("");

    }


    try {

        const requestedOutput = args.output
            ? path.resolve(args.output)
            : undefined;

        const result = await processReplacementJob({
            htmlFile,
            recipeFile,
            replacementOverrides,
            outputFile: requestedOutput
        });


        const outputFile = result.outputPath;


        if (!outputFile) {

            throw new Error(
                "Processor did not return an output filename."
            );

        }


        console.log("");
        console.log("Replacement complete.");
        console.log(`Output: ${outputFile}`);


        if (
            args.verbose &&
            Array.isArray(result.results)
        ) {

            console.log("");

            for (const item of result.results) {

                console.log(
                    `${item.assetId}: ${item.status}`
                );

            }

        }

    }

    catch (error) {

        console.error("");
        console.error("Replacement failed.");
        console.error(error.message);

        if (args.verbose && error.stack) {

            console.error("");
            console.error(error.stack);

        }

        process.exit(1);

    }

}


main();