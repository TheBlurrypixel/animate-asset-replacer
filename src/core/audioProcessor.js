const fs=require("fs");
const path=require("path");
const MIME_BY_EXT={
  ".mp3":"audio/mpeg",".mpeg":"audio/mpeg",".mpga":"audio/mpeg",
  ".wav":"audio/wav",".ogg":"audio/ogg",".oga":"audio/ogg",
  ".m4a":"audio/mp4",".mp4":"audio/mp4",".aac":"audio/aac",".webm":"audio/webm"
};
function inferAudioMime(filePath){ return MIME_BY_EXT[path.extname(filePath).toLowerCase()] || null; }
async function processAudio(sourcePath, originalMimeType, settings) {
  const buffer=fs.readFileSync(sourcePath);
  const op=settings.operation || {};
  const mimeType=op.mime_type || inferAudioMime(sourcePath) || originalMimeType;
  if (!mimeType || !mimeType.startsWith("audio/"))
    throw new Error(`Could not determine audio MIME type for "${sourcePath}". Set operation.mime_type.`);
  return {buffer,mimeType,bytes:buffer.length};
}
module.exports={processAudio,inferAudioMime};
