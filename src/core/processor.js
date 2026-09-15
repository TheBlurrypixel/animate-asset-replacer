const fs=require("fs");
const path=require("path");
const {loadRecipe,normalizeRecipe}=require("./recipe");
const {findManifestAsset}=require("./manifestParser");
const {parseDataUri,toDataUri}=require("./dataUri");
const {processImage,inspectImage}=require("./imageProcessor");
const {processAudio}=require("./audioProcessor");
const {evaluateConditions}=require("./conditionEngine");

function resolveReplacementPath(p,recipeFile){
  if(!p) return null;
  return path.isAbsolute(p) ? path.normalize(p) : path.resolve(path.dirname(recipeFile),p);
}
function mergeSettings(recipe,replacement){
  return {
    image_processing:{...(recipe.image_processing||{}),...(replacement.image_processing||{})},
    operation:{...(recipe.operation||{}),...(replacement.operation||{})},
    verification:{...(recipe.verification||{}),...(replacement.verification||{})}
  };
}
function determineAssetType(repl,asset,parsed){
  if(repl.asset_type) return repl.asset_type;
  if(parsed.mimeType.startsWith("audio/")) return "audio";
  if(parsed.mimeType.startsWith("image/")) return "image";
  if(asset.manifestType==="sound" || asset.manifestType==="audio") return "audio";
  if(asset.manifestType==="image") return "image";
  throw new Error(`Could not determine asset type for "${repl.asset_id}". Add asset_type.`);
}
async function processReplacementJob(payload){
  const {htmlFile,recipeFile,replacementOverrides=[],outputFile}=payload;
  if(!htmlFile||!recipeFile) throw new Error("HTML file and Recipe JSON are required.");
  const recipe=normalizeRecipe(loadRecipe(recipeFile));
  let html=fs.readFileSync(htmlFile,"utf8");
  const results=[];
  for(let i=0;i<recipe.replacements.length;i++){
    const repl=recipe.replacements[i];
    const assetId=repl.asset_id || (recipe.target&&recipe.target.asset_id);
    if(!assetId) throw new Error(`Replacement ${i+1} has no asset_id.`);
    const rawPath=replacementOverrides[i] || repl.replacement_image || repl.replacement_audio;
    const replacementPath=resolveReplacementPath(rawPath,recipeFile);
    if(!replacementPath) throw new Error(`Replacement ${i+1} (${assetId}) has no replacement file.`);
    if(!fs.existsSync(replacementPath)) throw new Error(`Replacement file does not exist: ${replacementPath}`);

    const asset=findManifestAsset(html,assetId);
    const parsed=parseDataUri(asset.dataUri);
    const assetType=determineAssetType(repl,asset,parsed);
    const settings=mergeSettings(recipe,repl);
    const conditions={...(recipe.conditions||{}),...(repl.conditions||{})};

    if(assetType==="image"){
      const originalMeta=await inspectImage(parsed.buffer);
      const replacementMeta=await inspectImage(replacementPath);
      const context={recipe,replacement:repl,replacementIndex:i,
        asset:{id:assetId,type:"image",manifestType:asset.manifestType,manifestSrc:asset.manifestSrc},
        originalImage:originalMeta,replacementImage:replacementMeta,originalAudio:null,replacementAudio:null};
      if(!(await evaluateConditions(conditions,context))){
        results.push({status:"skipped",assetId,assetType:"image",reason:"Replacement conditions were not satisfied."}); continue;
      }
      const processed=await processImage(replacementPath,parsed.buffer,settings);
      if(settings.verification?.verify_encoded_image_dimensions_match_original &&
        (processed.processed.width!==processed.original.width || processed.processed.height!==processed.original.height))
        throw new Error(`Asset "${assetId}": encoded image dimensions do not match original.`);
      const newUri=toDataUri(processed.buffer,processed.mimeType);
      html=html.slice(0,asset.replaceStart)+newUri+html.slice(asset.replaceEnd);
      results.push({status:"success",assetId,assetType:"image",original:processed.original,replacement:processed.source,
        processed:processed.processed,resized:processed.resized,mimeType:processed.mimeType});
      continue;
    }

    if(assetType==="audio"){
      const stat=fs.statSync(replacementPath);
      const context={recipe,replacement:repl,replacementIndex:i,
        asset:{id:assetId,type:"audio",manifestType:asset.manifestType,manifestSrc:asset.manifestSrc},
        originalImage:null,replacementImage:null,
        originalAudio:{mimeType:parsed.mimeType,bytes:parsed.buffer.length},
        replacementAudio:{bytes:stat.size,extension:path.extname(replacementPath).toLowerCase()}};
      if(!(await evaluateConditions(conditions,context))){
        results.push({status:"skipped",assetId,assetType:"audio",reason:"Replacement conditions were not satisfied."}); continue;
      }
      const processed=await processAudio(replacementPath,parsed.mimeType,settings);
      const newUri=toDataUri(processed.buffer,processed.mimeType);
      html=html.slice(0,asset.replaceStart)+newUri+html.slice(asset.replaceEnd);
      results.push({status:"success",assetId,assetType:"audio",originalMimeType:parsed.mimeType,
        originalBytes:parsed.buffer.length,mimeType:processed.mimeType,bytes:processed.bytes});
      continue;
    }
    throw new Error(`Unsupported asset type "${assetType}".`);
  }

  const suffix=recipe.output?.filename_suffix || "_processed";
  const pp=path.parse(htmlFile);
  const outputPath=outputFile
    ? path.resolve(outputFile)
    : path.join(pp.dir,pp.name+suffix+pp.ext);
  fs.writeFileSync(outputPath,html,"utf8");
  return {status:"complete",outputPath,replacementsRequested:recipe.replacements.length,
    replacementsSucceeded:results.filter(r=>r.status==="success").length,
    replacementsSkipped:results.filter(r=>r.status==="skipped").length,results};
}
module.exports={processReplacementJob};
