function parseDataUri(uri) {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(uri);
  if (!match) throw new Error("Unsupported or invalid data URI.");
  return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
}
function toDataUri(buffer, mimeType) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
module.exports = { parseDataUri, toDataUri };