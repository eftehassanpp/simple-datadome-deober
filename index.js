const { processTags, processSlider, processInter } = require("./helper/deober");

function main() {
  const args = process.argv.slice(2);
  args.forEach((a) => {
    if (a == "slider") {
      console.log("deobfuscating slider from inputs/slider.txt");
      processSlider("./inputs/slider.txt", "./outputs/slider_out.txt");
    } else if (a == "tags") {
      console.log("deobfuscating tags from inputs/tags.txt");
      processTags("./inputs/tags.txt", "./outputs/tags_out.txt");
    } else if (a == "inter") {
      console.log("deobfuscating interstitial from inputs/inter.txt");
      processInter("./inputs/inter.txt", "./outputs/inter_out.txt");
    } else
      console.error(
        "please specify the type of script to deobfuscate eg. slider,tags"
      );
  });
}
main();
