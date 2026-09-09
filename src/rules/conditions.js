/*
  Edit this file for custom JavaScript conditions.
  Return true to continue, false to skip, or throw Error to stop.
*/
async function shouldReplace(context) {
  const { recipe, asset, originalImage, replacementImage } = context;

  // Example:
  // if (replacementImage.width < originalImage.width) {
  //   throw new Error("Replacement image must not be smaller than the original.");
  // }

  return true;
}
module.exports = { shouldReplace };