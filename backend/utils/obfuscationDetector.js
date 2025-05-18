const acorn = require('acorn');
const acornLoose = require('acorn-loose');

// Create a more tolerant parser
const createTolerantParser = () => {
  return Parser.extend(
    require('acorn-loose')
  );
};

exports.detectObfuscation = (code) => {
  // Initialize metrics
  const metrics = {
    evalCount: 0,
    shortVarCount: 0,
    isMinified: false,
    otherFactors: 0
  };

  try {
    console.log('Detecting obfuscation techniques');

    // Sanitize code before analysis
    const sanitizedCode = sanitizeCode(code);

    // Check if code is minified
    metrics.isMinified = isCodeMinified(sanitizedCode);
    console.log(`Is code minified: ${metrics.isMinified}`);

    // Count eval occurrences
    metrics.evalCount = countEvals(sanitizedCode);
    console.log(`Eval count: ${metrics.evalCount}`);

    let ast;
    try {
      // Try to parse with standard acorn first (module)
      ast = acorn.parse(sanitizedCode, {
        ecmaVersion: 2022,
        sourceType: 'module',
        allowAwaitOutsideFunction: true,
        allowImportExportEverywhere: true,
        allowReserved: true,
        locations: false
      });
    } catch (standardParseError) {
      console.warn('Standard parsing failed (module):', standardParseError.message);
      try {
        // Try to parse with acorn as script (CommonJS/legacy)
        ast = acorn.parse(sanitizedCode, {
          ecmaVersion: 2022,
          sourceType: 'script',
          allowAwaitOutsideFunction: true,
          allowImportExportEverywhere: true,
          allowReserved: true,
          locations: false
        });
      } catch (scriptParseError) {
        console.warn('Standard parsing failed (script):', scriptParseError.message);
        try {
          // Use acorn-loose directly for loose parsing
          ast = acornLoose.parse(sanitizedCode, {
            ecmaVersion: 2022,
            sourceType: 'module',
            allowAwaitOutsideFunction: true,
            allowImportExportEverywhere: true,
            allowReserved: true,
            locations: false
          });
        } catch (looseParseError) {
          console.warn('Loose parsing also failed:', looseParseError.message);
          // If all parsing fails, use regex-based fallback
          metrics.shortVarCount = countShortVariablesWithRegex(sanitizedCode);
          return metrics;
        }
      }
    }

    // Analyze AST for short variable names and other obfuscation techniques
    analyzeAST(ast, metrics);

    console.log(`Short variable count: ${metrics.shortVarCount}`);

    // Check for other obfuscation techniques
    metrics.otherFactors = detectOtherObfuscationTechniques(code);

    return metrics;
  } catch (error) {
    console.error('Error detecting obfuscation:', error);
    return metrics;
  }
};

function isCodeMinified(code) {
  // Check average line length
  const lines = code.split('\n');
  const avgLineLength = code.length / lines.length;

  // If average line length is high, likely minified
  return avgLineLength > 100;
}

function countEvals(code) {
  // Count direct eval calls
  const directEvalRegex = /\beval\s*\(/g;
  const directEvalMatches = code.match(directEvalRegex) || [];

  // Count indirect eval calls (Function constructor)
  const indirectEvalRegex = /new\s+Function\s*\(/g;
  const indirectEvalMatches = code.match(indirectEvalRegex) || [];

  // Count setTimeout/setInterval with string arguments
  const timeoutEvalRegex = /set(Timeout|Interval)\s*\(\s*['"`]/g;
  const timeoutEvalMatches = code.match(timeoutEvalRegex) || [];

  return directEvalMatches.length + indirectEvalMatches.length + timeoutEvalMatches.length;
}

function analyzeAST(ast, metrics) {
  // Track variable names
  const variableNames = [];

  // Visitor function for AST traversal
  function visit(node) {
    // Check for variable declarations
    if (node.type === 'VariableDeclarator' && node.id && node.id.type === 'Identifier') {
      variableNames.push(node.id.name);
    }

    // Check for function parameters
    if ((node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') && node.params) {
      node.params.forEach(param => {
        if (param.type === 'Identifier') {
          variableNames.push(param.name);
        }
      });
    }

    // Recursively visit child nodes
    for (const key in node) {
      if (node[key] && typeof node[key] === 'object') {
        if (Array.isArray(node[key])) {
          node[key].forEach(child => {
            if (child && typeof child === 'object') {
              visit(child);
            }
          });
        } else {
          visit(node[key]);
        }
      }
    }
  }

  // Start traversal
  visit(ast);

  // Count short variable names (1-2 characters)
  metrics.shortVarCount = variableNames.filter(name => name.length <= 2 && !isCommonShortName(name)).length;
}

function isCommonShortName(name) {
  // Common short variable names that are not indicators of obfuscation
  const commonShortNames = ['i', 'j', 'k', 'x', 'y', 'z', 'id', 'el', 'e', 'ev', 'ex', 'fn', 'cb'];
  return commonShortNames.includes(name);
}

function countShortVariablesWithRegex(code) {
  // Fallback method using regex
  // This is less accurate but works when parsing fails
  console.log('Using regex fallback for short variable detection');

  // Match variable declarations
  const varDeclarationRegex = /\b(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
  const varMatches = [];
  let match;

  while ((match = varDeclarationRegex.exec(code)) !== null) {
    varMatches.push(match[1]);
  }

  // Match function parameters
  const funcParamRegex = /\bfunction\s*(?:[a-zA-Z_$][a-zA-Z0-9_$]*)?\s*\(([^)]*)\)/g;
  const paramMatches = [];

  while ((match = funcParamRegex.exec(code)) !== null) {
    const params = match[1].split(',').map(p => p.trim());
    paramMatches.push(...params.filter(p => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(p)));
  }

  // Combine and count short names
  const allNames = [...varMatches, ...paramMatches];
  return allNames.filter(name => name.length <= 2 && !isCommonShortName(name)).length;
}

/**
 * Sanitize code to make it more parseable
 * This function removes or fixes common syntax issues that cause parsing errors
 */
function sanitizeCode(code) {
  if (!code || typeof code !== 'string') {
    return '';
  }

  try {
    // Handle non-standard syntax that causes parsing errors
    let sanitized = code;

    // Remove flow type annotations
    sanitized = sanitized.replace(/:\s*[A-Za-z0-9_$]+(\[\])*/g, '');
    sanitized = sanitized.replace(/<[A-Za-z0-9_$,\s]+>/g, '');

    // Remove TypeScript-specific syntax
    sanitized = sanitized.replace(/readonly\s+/g, '');
    sanitized = sanitized.replace(/private\s+/g, '');
    sanitized = sanitized.replace(/public\s+/g, '');
    sanitized = sanitized.replace(/protected\s+/g, '');
    sanitized = sanitized.replace(/abstract\s+/g, '');
    sanitized = sanitized.replace(/implements\s+[A-Za-z0-9_$]+/g, '');

    // Handle JSX syntax
    sanitized = sanitized.replace(/<[A-Za-z0-9_$]+(\s+[^>]*)?\/?>/g, '"JSX_ELEMENT"');
    sanitized = sanitized.replace(/<\/[A-Za-z0-9_$]+>/g, '"JSX_CLOSE"');

    // Handle decorators
    sanitized = sanitized.replace(/@[A-Za-z0-9_$]+(\([^)]*\))?/g, '/* decorator */');

    // Handle non-standard comments
    sanitized = sanitized.replace(/\/\*\*[\s\S]*?\*\//g, '/* comment */');

    // Handle template literals with expressions
    sanitized = sanitized.replace(/\${[^}]*}/g, '${expr}');

    // Limit file size for very large files
    const MAX_SIZE = 500000; // 500KB
    if (sanitized.length > MAX_SIZE) {
      console.log(`File too large (${sanitized.length} bytes), truncating to ${MAX_SIZE} bytes`);
      sanitized = sanitized.substring(0, MAX_SIZE);
    }

    return sanitized;
  } catch (error) {
    console.error('Error sanitizing code:', error);
    return code; // Return original if sanitization fails
  }
}

function detectOtherObfuscationTechniques(code) {
  let score = 0;

  // Check for string concatenation to hide strings
  const stringConcatRegex = /['"`]\s*\+\s*['"`]/g;
  const stringConcatMatches = code.match(stringConcatRegex) || [];
  if (stringConcatMatches.length > 5) {
    score += Math.min(stringConcatMatches.length / 5, 3);
  }

  // Check for hex/unicode escape sequences
  const escapeSequenceRegex = /\\x[0-9a-f]{2}|\\u[0-9a-f]{4}/gi;
  const escapeMatches = code.match(escapeSequenceRegex) || [];
  if (escapeMatches.length > 3) {
    score += Math.min(escapeMatches.length / 3, 3);
  }

  // Check for excessive use of global objects
  const globalObjectRegex = /\b(?:window|document|global)\[['"`]/g;
  const globalMatches = code.match(globalObjectRegex) || [];
  if (globalMatches.length > 2) {
    score += Math.min(globalMatches.length / 2, 2);
  }

  // Check for encoded data (base64)
  const base64Regex = /['"`][A-Za-z0-9+/=]{30,}['"`]/g;
  const base64Matches = code.match(base64Regex) || [];
  if (base64Matches.length > 0) {
    score += Math.min(base64Matches.length, 2);
  }

  return score;
}
