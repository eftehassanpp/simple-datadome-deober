function bracketsToDot(string, brackets = "single") {
  var LFT_RT_TRIM_DOTS = /^[.]*|[.]*$/g;
  let Regex;
  if (brackets == "single") {
    Regex = /\['([^'\[\]]+)'\]/g;
  } else if (brackets == "double") {
    Regex = /\[\['([^']+)'\]\]/g;
  }
  if (typeof string === "string") {
    return string.replace(Regex, ".$1").replace(LFT_RT_TRIM_DOTS, "");
  }
  return string;
}

module.exports = bracketsToDot;
