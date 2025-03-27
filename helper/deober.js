const vm = require("vm");
const fs = require("fs");
const t = require("@babel/types");
const parser = require("@babel/parser");
const generate = require("@babel/generator").default;
const traverse = require("@babel/traverse").default;
const { JSDOM } = require("jsdom");
const bracketsToDot = require("./bracketsToDot");
const decode = require("./hexDecoder");

const { window } = new JSDOM(``);

function addArrayInContext(ast, context) {
  traverse(ast, {
    VariableDeclaration(path) {
      let declarations = path.node.declarations;
      Array.from(declarations).forEach((dec) => {
        if (
          t.isMemberExpression(dec.init) &&
          t.isIdentifier(dec.init.object, { name: "String" }) &&
          t.isIdentifier(dec.init.property, { name: "fromCharCode" })
        ) {
          let code = "var " + generate(dec).code;
          // console.log("String.fromCharCode:", code);
          vm.runInContext(code, context);
        }
        if (
          dec.init &&
          dec.init.type &&
          dec.init.type == "ArrayExpression" &&
          dec.init.elements.length > 50
        ) {
          try {
            let code = generate(dec).code;
            //   console.log("array exp:", code);
            vm.runInContext(code, context);
            console.log(
              `****************** big Array of len: ${dec.init.elements.length} added to context ******************`
            );
          } catch (err) {
            console.error(`Error running code:`, err);
          }
        }
      });
    },
  });
}

function replaceTwoParamsCall(ast, context) {
  let replacements = 0;
  traverse(ast, {
    CallExpression(path) {
      if (
        // if the function is called with 2 arguments and is inside our context
        path.node.arguments.length === 2 &&
        path.node.arguments[0].type === "NumericLiteral" &&
        path.node.arguments[1].type === "NumericLiteral" &&
        path.node.callee.name in context
      ) {
        //   console.log("Generating code for:", path.node);

        try {
          if (!path.node || !path.node.type) {
            console.error("Invalid AST node:", path.node);
            return;
          }
          let code = generate(path.node).code;
          let result = vm.runInContext(code, context);
          // console.log(code,result)
          if (typeof result === "string") {
            path.replaceWith(t.stringLiteral(result));
          } else if (typeof result === "number") {
            path.replaceWith(t.numericLiteral(result));
          } else {
            path.replaceWith(t.valueToNode(result));
          }

          replacements++;
        } catch (error) {
          console.error("Error generating code:", error);
        }
      }
    },
  });
  console.log(
    `****************** evaluated ${replacements} two-params function calls ******************`
  );
}
function replaceSingleParamsCall(ast, context) {
  let replacements = 0;
  traverse(ast, {
    CallExpression(path) {
      if (
        // if the function is called with 2 arguments and is inside our context
        path.node.arguments.length === 1 &&
        path.node.arguments[0].type === "NumericLiteral" &&
        path.node.callee.name in context
      ) {
        //   console.log("Generating code for:", path.node);

        try {
          if (!path.node || !path.node.type) {
            console.error("Invalid AST node:", path.node);
            return;
          }
          let code = generate(path.node).code;
          let result = vm.runInContext(code, context);
          // console.log(code,result)
          if (typeof result === "string") {
            path.replaceWith(t.stringLiteral(result));
          } else if (typeof result === "number") {
            path.replaceWith(t.numericLiteral(result));
          } else {
            path.replaceWith(t.valueToNode(result));
          }

          replacements++;
        } catch (error) {
          console.error("Error generating code:", error);
        }
      }
    },
  });
  console.log(
    `****************** evaluated ${replacements} single-params function calls ******************`
  );
}

const cleanStrings = (ast) => {
  let binraryExpressions = 0;
  traverse(ast, {
    BinaryExpression(path) {
      if (path.node.operator === "+") {
        const mergedExpr = mergeStringLiterals(path.node);
        if (t.isStringLiteral(mergedExpr)) {
          path.replaceWith(mergedExpr);
          binraryExpressions++;
        }
      }
    },
  });

  traverse(ast, {
    MemberExpression(path) {
      if (
        t.isStringLiteral(path.node.property) &&
        /^[a-zA-Z$_][a-zA-Z$_0-9]*$/.test(path.node.property.value)
      ) {
        const identifier = t.identifier(path.node.property.value);
        path.node.property = identifier;
        path.node.computed = false;
      }
    },
  });

  traverse(ast, {
    MemberExpression(path) {
      // Check if the property access is using bracket notation with a string literal
      if (
        path.node.computed &&
        t.isArrayExpression(path.node.property) &&
        t.isStringLiteral(path.node.property.elements[0])
      ) {
        let realcode = path.node.property.elements[0].extra.rawValue;
        path.node.property = t.identifier(realcode);
        path.node.computed = false;
      }
    },
  });
  binraryExpressions > 0 &&
    console.log(
      `****************** ${binraryExpressions} binary expressions evaluated ******************`
    );
};

function mergeStringLiterals(expr) {
  if (t.isBinaryExpression(expr, { operator: "+" })) {
    const left = mergeStringLiterals(expr.left);
    const right = mergeStringLiterals(expr.right);
    if (t.isStringLiteral(left) && t.isStringLiteral(right)) {
      return t.stringLiteral(left.value + right.value);
    }
    return t.binaryExpression("+", left, right);
  }
  return expr;
}
const safeAtob = (str) => {
  try {
    return atob(str);
  } catch (e) {
    return null;
  }
};
const getInnerFunctionCodeAst = (ast, mode) => {
  let functionCodeAST;
  if (mode && mode == "inter") {
    traverse(ast, {
      CallExpression(path) {
        if (path.node.callee.type === "FunctionExpression") {
          let entryFunctionBody = path.node.callee.body.body;
          functionCodeAST = t.file(t.program(entryFunctionBody));
          path.stop();
        }
      },
    });
  } else {
    traverse(ast, {
      ObjectProperty(path) {
        if (path.node.key.value === 1) {
          let functionsCode = path.node.value.elements[0].body.body;
          functionCodeAST = t.file(t.program(functionsCode));
          path.stop();
        }
      },
    });
  }
  return functionCodeAST;
};

const addHelpersInContext = (ast, context) => {
  traverse(ast, {
    FunctionDeclaration(innerPath) {
      if (
        innerPath.node.params.length >= 1 &&
        innerPath.parent.type === "Program"
      ) {
        let code = generate(innerPath.node).code;
        try {
          vm.runInContext(code, context);
        } catch (err) {
          console.error(`Error running code: ${code}`, err);
        }
      }
    },
  });
  Object.keys(context).length &&
    console.log(
      `****************** context updated with ${
        Object.keys(context).length
      } values ******************`
    );
};

const deobfuscateValues = (code, mode) => {
  let ast = parser.parse(code);
  const context = vm.createContext({ atob: safeAtob });
  // console.log(context);

  let functionCodeAST = getInnerFunctionCodeAst(ast, mode);

  addHelpersInContext(functionCodeAST, context);

  replaceTwoParamsCall(ast, context);

  addArrayInContext(functionCodeAST, context);

  cleanStrings(ast);

  replaceSingleParamsCall(ast, context);

  cleanStrings(ast);

  return generate(ast).code;
};

function processTags(inputFilePath, outputFilePath) {
  const outputFile = outputFilePath;
  let content = fs.readFileSync(inputFilePath, "utf8");
  const dotnotation = bracketsToDot(content, "double");
  let deobed = deobfuscateValues(dotnotation);
  fs.writeFileSync(outputFile, deobed, "utf8");
  console.log(
    "tags deobfuscation successful, saved to> ./outputs/tags_out.txt"
  );
}

function processSlider(inputFilePath, outputFilePath) {
  const outputFile = outputFilePath;
  let content = fs.readFileSync(inputFilePath, "utf8");
  content = decode(content);
  const dotnotation = bracketsToDot(content, "double");
  // console.log("doing deobber")
  let deobed = deobfuscateValues(dotnotation);
  fs.writeFileSync(outputFile, deobed, "utf8");
  console.log(
    "slider deobfuscation successful, saved to> ./outputs/slider_out.txt"
  );
}
function processInter(inputFilePath, outputFilePath) {
  const outputFile = outputFilePath;
  let content = fs.readFileSync(inputFilePath, "utf8");
  content = decode(content);
  const dotnotation = bracketsToDot(content, "double");
  // console.log("doing deobber")
  let deobed = deobfuscateValues(dotnotation, "inter");
  fs.writeFileSync(outputFile, deobed, "utf8");
  console.log(
    "interstitial deobfuscation successful, saved to> ./outputs/inter_out.txt"
  );
}

module.exports = { processTags, processSlider, processInter };
