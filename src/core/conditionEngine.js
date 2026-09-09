const { shouldReplace } = require("../rules/conditions");

function evaluateJsonConditions(conditions, context) {
  const c = conditions || {};
  if (c.asset_id_equals !== undefined && context.asset.id !== c.asset_id_equals) return false;
  if (c.replacement_width_greater_than !== undefined && !(context.replacementImage.width > c.replacement_width_greater_than)) return false;
  if (c.replacement_width_at_least !== undefined && !(context.replacementImage.width >= c.replacement_width_at_least)) return false;
  if (c.replacement_height_at_least !== undefined && !(context.replacementImage.height >= c.replacement_height_at_least)) return false;
  if (Array.isArray(c.replacement_format_in) && !c.replacement_format_in.includes(context.replacementImage.format)) return false;
  if (c.original_width_equals !== undefined && context.originalImage.width !== c.original_width_equals) return false;
  if (c.original_height_equals !== undefined && context.originalImage.height !== c.original_height_equals) return false;
  return true;
}

async function evaluateConditions(conditions, context) {
  if (!evaluateJsonConditions(conditions, context)) return false;
  return !!(await shouldReplace(context));
}

module.exports = { evaluateConditions };
