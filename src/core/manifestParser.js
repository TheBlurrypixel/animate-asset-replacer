function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function findBalancedObject(text, position) {
  for (let start = position; start >= 0; start--) {
    if (text[start] !== "{") continue;
    let depth=0, quote=null, escaped=false;
    for (let i=start; i<text.length; i++) {
      const ch=text[i];
      if (quote) {
        if (escaped) escaped=false;
        else if (ch==="\\") escaped=true;
        else if (ch===quote) quote=null;
        continue;
      }
      if (ch==="'" || ch==='"' || ch==="`") { quote=ch; continue; }
      if (ch==="{") depth++;
      else if (ch==="}") {
        depth--;
        if (depth===0) {
          if (start<=position && position<=i)
            return {start,end:i+1,text:text.slice(start,i+1)};
          break;
        }
      }
    }
  }
  throw new Error("Could not determine manifest object boundaries.");
}
function readStringProp(obj, name) {
  const n=escapeRegExp(name);
  const m=new RegExp(`(?:["']${n}["']|${n})\\s*:\\s*(["'])(.*?)\\1`,"s").exec(obj);
  return m ? m[2] : null;
}
function findManifestAsset(html, assetId) {
  const idRe=new RegExp(`(?:["']id["']|id)\\s*:\\s*["']${escapeRegExp(assetId)}["']`,"g");
  const matches=Array.from(html.matchAll(idRe));
  if (!matches.length) throw new Error(`Could not find manifest asset with id "${assetId}".`);
  for (const match of matches) {
    const obj=findBalancedObject(html,match.index);
    const dm=/(?:["']dataURI["']|dataURI)\s*:\s*([A-Za-z_$][\w$]*|["']data:[^"']+["'])/s.exec(obj.text);
    if (!dm) continue;
    const value=dm[1], manifestType=readStringProp(obj.text,"type"), manifestSrc=readStringProp(obj.text,"src");
    if (value[0]==="'" || value[0]==='"') {
      const uri=value.slice(1,-1), local=obj.text.indexOf(value,dm.index);
      return {dataUri:uri,replaceStart:obj.start+local+1,replaceEnd:obj.start+local+value.length-1,
        referenceType:"inline",referenceName:null,manifestType,manifestSrc};
    }
    const varName=value;
    const vr=new RegExp(`(?:\\b(?:var|let|const)\\s+)?${escapeRegExp(varName)}\\s*=\\s*(["'])(data:[^;,"']+;base64,[^"']*)\\1`,"s");
    const vm=vr.exec(html);
    if (!vm) throw new Error(`Manifest asset "${assetId}" references "${varName}", but its data URI assignment was not found.`);
    const uri=vm[2], off=vm[0].indexOf(uri);
    return {dataUri:uri,replaceStart:vm.index+off,replaceEnd:vm.index+off+uri.length,
      referenceType:"variable",referenceName:varName,manifestType,manifestSrc};
  }
  throw new Error(`Found manifest id "${assetId}", but could not resolve its dataURI property.`);
}
module.exports={findManifestAsset};
