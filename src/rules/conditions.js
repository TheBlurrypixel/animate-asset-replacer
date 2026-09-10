/*
  Runs once per image OR audio replacement.
  Return true to replace, false to skip, or throw Error to stop.

  context.asset.type: "image" | "audio"
  Image: context.originalImage / context.replacementImage
  Audio: context.originalAudio / context.replacementAudio
*/
async function shouldReplace(context) {
  return true;
}
module.exports={shouldReplace};
