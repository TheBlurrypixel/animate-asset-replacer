const { shouldReplace } = require("../rules/conditions");
function evaluateJsonConditions(c, context) {
  c=c||{};
  if (c.asset_id_equals!==undefined && context.asset.id!==c.asset_id_equals) return false;
  if (c.asset_type_equals!==undefined && context.asset.type!==c.asset_type_equals) return false;
  if (context.replacementImage) {
    if (c.replacement_width_greater_than!==undefined && !(context.replacementImage.width>c.replacement_width_greater_than)) return false;
    if (c.replacement_width_at_least!==undefined && !(context.replacementImage.width>=c.replacement_width_at_least)) return false;
    if (c.replacement_height_at_least!==undefined && !(context.replacementImage.height>=c.replacement_height_at_least)) return false;
    if (Array.isArray(c.replacement_format_in) && !c.replacement_format_in.includes(context.replacementImage.format)) return false;
  }
  if (context.originalImage) {
    if (c.original_width_equals!==undefined && context.originalImage.width!==c.original_width_equals) return false;
    if (c.original_height_equals!==undefined && context.originalImage.height!==c.original_height_equals) return false;
  }
  if (context.replacementAudio) {
    if (c.replacement_audio_bytes_at_least!==undefined && context.replacementAudio.bytes<c.replacement_audio_bytes_at_least) return false;
    if (Array.isArray(c.replacement_audio_extension_in) && !c.replacement_audio_extension_in.includes(context.replacementAudio.extension)) return false;
  }
  return true;
}
async function evaluateConditions(c,context){
  if(!evaluateJsonConditions(c,context)) return false;
  return !!(await shouldReplace(context));
}
module.exports={evaluateConditions};
