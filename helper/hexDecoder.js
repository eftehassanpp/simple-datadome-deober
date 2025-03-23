module.exports = function decode(content) {
  const pattern = /(\\x[0-9a-fA-F]{2})+/g;
  let matches = content.match(pattern) || [];

  let decodedStrings = matches.map((match) => {
    return match
      .split("\\x")
      .filter((hex) => hex)
      .map((hex) => String.fromCharCode(parseInt(hex, 16)))
      .join("");
  });
  for (let i = 0; i < matches.length; i++) {
    content = content.replace(
      matches[i],
      decodedStrings[i].replaceAll("'", '"')
    );
  }
  console.log(
    `****************** decoded ${matches.length} hexString ******************`
  );
  return content;
};
