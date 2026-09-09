const fs = require("fs");
const path = require("path");
const Ajv2020 = require("ajv/dist/2020").default;

function loadRecipe(recipePath) {
  const recipe = JSON.parse(fs.readFileSync(recipePath, "utf8"));

  const schemaPath = path.join(
    __dirname,
    "..",
    "..",
    "schemas",
    "replaceBackground.schema.json"
  );

  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

  const ajv = new Ajv2020({
    allErrors: true,
    strict: false
  });

  const validate = ajv.compile(schema);

  if (!validate(recipe)) {
    const detail = validate.errors
      .map(e => `${e.instancePath || "/"} ${e.message}`)
      .join("\n");

    throw new Error(`Recipe validation failed:\n${detail}`);
  }

  return recipe;
}

module.exports = { loadRecipe };
