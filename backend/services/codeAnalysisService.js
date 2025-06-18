const prettier = require('prettier');
const acorn = require('acorn');
const acornLoose = require('acorn-loose');
const fs = require('fs').promises;
const path = require('path');
const obfuscationDetector = require('../utils/obfuscationDetector');

// Debug directory for saving problematic files
const DEBUG_DIR = path.join(__dirname, '../../debug');

// Acorn parser options for different scenarios
const PARSER_OPTIONS = {
  modern: {
    ecmaVersion: 'latest',
    sourceType: 'unambiguous',
    allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true,
    allowReserved: true,
    allowReturnOutsideFunction: true,
    allowHashBang: true,
    locations: true,
    ranges: true
  },
  module: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true,
    allowReserved: true,
    allowReturnOutsideFunction: true,
    allowHashBang: true,
    locations: true,
    ranges: true
  },
  script: {
    ecmaVersion: 'latest',
    sourceType: 'script',
    allowAwaitOutsideFunction: true,
    allowReserved: true,
    allowReturnOutsideFunction: true,
    allowHashBang: true,
    locations: true,
    ranges: true
  }
};

// Prettier options
const PRETTIER_OPTIONS = {
  parser: 'babel',
  plugins: [require('prettier/parser-babel')],
  sourceType: 'unambiguous',
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 80,
  arrowParens: 'avoid',
  bracketSpacing: true,
  endOfLine: 'lf',
  bracketSameLine: false
};

// Supported file extensions and their parsers
const PARSER_MAP = {
  '.js': 'babel',
  '.jsx': 'babel',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.json': 'json',
  '.md': 'markdown',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.html': 'html'
};

// Module format detection patterns
const MODULE_PATTERNS = {
  UMD: [
    /\(function\s*\(\s*global\s*,\s*factory\s*\)/,
    /\(function\s*\(\s*root\s*,\s*factory\s*\)/,
    /\(function\s*\(\s*global\s*,\s*factory\s*\)/,
    /\(function\s*\(\s*window\s*,\s*factory\s*\)/
  ],
  ES: [
    /export\s+default/,
    /import\s+.*\s+from/,
    /export\s+{/,
    /export\s+const/,
    /export\s+function/
  ],
  CommonJS: [
    /module\.exports/,
    /require\s*\(/,
    /exports\./,
    /__webpack_require__/
  ]
};

// UMD module patterns
const UMD_PATTERNS = [
  /^\(function\s*\(\s*global\s*,\s*factory\s*\)/,
  /^\(function\s*\(\s*root\s*,\s*factory\s*\)/,
  /^\(function\s*\(\s*window\s*,\s*factory\s*\)/,
  /^\(function\s*\(\s*global\s*,\s*factory\s*\)/,
  /^\(function\s*\(/,
  /^\(function\s*\([^)]*\)\s*{/
];

exports.analyzeCode = async (code, filePath = '') => {
  try {
    console.log('Analyzing code for obfuscation');
    
    // Validate input
    if (!code || typeof code !== 'string') {
      throw new Error('Invalid code input: code must be a non-empty string');
    }

    // Log the raw code for debugging
    console.log('Raw code preview:', code.substring(0, 200) + '...');
    
    // Save and validate file content
    const { cleanedCode, validationInfo } = await validateFileContent(code, filePath);
    
    // Try parsing with different strategies
    const parseInfo = await tryParseStrategies(cleanedCode);
    
    // If parsing failed, log and continue with basic analysis
    if (!parseInfo.success) {
      console.warn('Parsing failed, falling back to basic analysis:', parseInfo.errors);
    }
    
    // Try to beautify the code
    const formattedCode = await formatCode(cleanedCode, filePath);
    
    // Analyze the code for obfuscation
    const metrics = obfuscationDetector.detectObfuscation(formattedCode);
    
    // Calculate overall score based on metrics
    const score = calculateObfuscationScore(metrics);
    
    console.log(`Obfuscation analysis complete. Score: ${score}`);
    
    return {
      score,
      metrics,
      formattedCode,
      fileInfo: {
        extension: path.extname(filePath).toLowerCase(),
        size: cleanedCode.length,
        encoding: 'utf8',
        validationInfo,
        parseInfo
      }
    };
  } catch (error) {
    console.error('Error analyzing code:', error);
    
    // Save problematic code for debugging
    await saveDebugFile(code, filePath, error);
    
    // Return default values if analysis fails
    return {
      score: 0,
      metrics: {
        evalCount: 0,
        shortVarCount: 0,
        isMinified: false,
        error: error.message
      },
      formattedCode: code,
      fileInfo: {
        extension: path.extname(filePath).toLowerCase(),
        size: code.length,
        encoding: 'utf8',
        validationInfo: { success: false, error: error.message },
        parseInfo: { success: false, error: error.message }
      }
    };
  }
};

async function validateFileContent(code, filePath) {
  try {
    // Create debug directory if it doesn't exist
    await fs.mkdir(DEBUG_DIR, { recursive: true });
    
    // Generate debug filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const debugFilename = `validate_${path.basename(filePath)}_${timestamp}.js`;
    const debugPath = path.join(DEBUG_DIR, debugFilename);
    
    // Save the original code for inspection
    await fs.writeFile(debugPath, code, 'utf8');
    
    // Check for BOM
    const hasBOM = code.charCodeAt(0) === 0xFEFF;
    let cleanedCode = hasBOM ? code.slice(1) : code;
    
    // Check for binary content
    const binaryChars = cleanedCode.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g);
    const hasBinary = binaryChars !== null;
    
    // Check for common encoding issues
    const hasEncodingIssues = /[\uFFFD\uFFFE\uFFFF]/.test(cleanedCode);
    
    // Check for truncation
    const isTruncated = cleanedCode.length < 10; // Arbitrary minimum length
    
    // Save validation info
    const validationInfo = {
      timestamp: new Date().toISOString(),
      filePath,
      size: cleanedCode.length,
      hasBOM,
      hasBinary,
      binaryChars: hasBinary ? binaryChars.map(c => c.charCodeAt(0)) : [],
      hasEncodingIssues,
      isTruncated,
      debugPath
    };
    
    await fs.writeFile(
      `${debugPath}.validation.json`,
      JSON.stringify(validationInfo, null, 2),
      'utf8'
    );
    
    // If there are serious issues, throw an error
    if (hasBinary || hasEncodingIssues || isTruncated) {
      throw new Error(`File validation failed: ${JSON.stringify(validationInfo)}`);
    }
    
    return { cleanedCode, validationInfo };
  } catch (error) {
    console.error('Error validating file content:', error);
    throw error;
  }
}

async function tryParseStrategies(code) {
  // Log the code being parsed for debugging
  console.log('Attempting to parse code:', code.substring(0, 200) + '...');
  
  const strategies = [
    {
      name: 'acorn-unambiguous',
      parser: (code) => acorn.parse(code, PARSER_OPTIONS.modern),
      options: PARSER_OPTIONS.modern
    },
    {
      name: 'acorn-module',
      parser: (code) => acorn.parse(code, PARSER_OPTIONS.module),
      options: PARSER_OPTIONS.module
    },
    {
      name: 'acorn-script',
      parser: (code) => acorn.parse(code, PARSER_OPTIONS.script),
      options: PARSER_OPTIONS.script
    },
    {
      name: 'acorn-loose',
      parser: (code) => acornLoose.parse(code, PARSER_OPTIONS.script),
      options: PARSER_OPTIONS.script
    }
  ];

  const errors = [];
  
  for (const strategy of strategies) {
    try {
      console.log(`Trying parsing strategy: ${strategy.name}`);
      const ast = await strategy.parser(code);
      console.log(`Successfully parsed with ${strategy.name}`);
      return {
        success: true,
        strategy: strategy.name,
        ast: {
          type: ast.type,
          start: ast.start,
          end: ast.end,
          body: ast.body ? ast.body.length : 0
        }
      };
    } catch (error) {
      console.warn(`Strategy ${strategy.name} failed:`, error.message);
      errors.push({
        strategy: strategy.name,
        error: error.message,
        location: error.loc ? {
          line: error.loc.line,
          column: error.loc.column
        } : null
      });
      continue;
    }
  }

  // If all strategies fail, return error information
  return {
    success: false,
    errors,
    message: 'All parsing strategies failed'
  };
}

function containsTypeScriptSyntax(code) {
  // Simple heuristics for TS syntax
  return /implements\s+|interface\s+|enum\s+|:\s*\w+|<\w+.*>\s*\(/.test(code);
}

async function formatCode(code, filePath = '') {
  try {
    // Skip formatting if file is TS or code looks like TS
    if (
      filePath.endsWith('.ts') ||
      filePath.endsWith('.tsx') ||
      containsTypeScriptSyntax(code)
    ) {
      return code;
    }
    // Try to format the code with prettier
    console.log('Formatting code with prettier');
    return await prettier.format(code, { parser: 'babel' });
  } catch (error) {
    console.error('Error formatting code:', error);
    // If formatting fails, return the original code
    return code;
  }
}

async function saveDebugFile(code, filePath, error) {
  try {
    // Create debug directory if it doesn't exist
    await fs.mkdir(DEBUG_DIR, { recursive: true });
    
    // Generate debug filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const debugFilename = `debug_${path.basename(filePath)}_${timestamp}.js`;
    const debugPath = path.join(DEBUG_DIR, debugFilename);
    
    // Save the problematic code
    await fs.writeFile(debugPath, code, 'utf8');
    
    // Save error information
    const errorInfo = {
      timestamp: new Date().toISOString(),
      filePath,
      error: error.message,
      stack: error.stack
    };
    await fs.writeFile(
      `${debugPath}.error.json`,
      JSON.stringify(errorInfo, null, 2),
      'utf8'
    );
    
    console.log(`Debug files saved to ${debugPath}`);
  } catch (saveError) {
    console.error('Error saving debug files:', saveError);
  }
}

function calculateObfuscationScore(metrics) {
  // Calculate score based on metrics
  let score = 0;
  
  // Eval usage is a strong indicator (up to 40 points)
  score += Math.min(metrics.evalCount * 10, 40);
  
  // Short variable names (up to 30 points)
  score += Math.min(metrics.shortVarCount * 2, 30);
  
  // Minification (20 points)
  if (metrics.isMinified) {
    score += 20;
  }
  
  // Other factors (up to 10 points)
  score += metrics.otherFactors || 0;
  
  // Ensure score is between 0-100
  return Math.min(100, Math.max(0, score));
}

function getFileExtension(filePath) {
  return filePath ? path.extname(filePath).toLowerCase() : '';
}

function detectModuleType(code) {
  for (const [type, patterns] of Object.entries(MODULE_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(code))) {
      return type;
    }
  }
  return 'unknown';
}

async function validateAndParseCode(code, filePath) {
  try {
    // Step 1: Validate and clean the code (e.g., remove BOM, check binary)
    const { cleanedCode, validationInfo } = await validateFileContent(code, filePath);

    // Step 2: Try parsing the cleaned code with different strategies
    const parseInfo = await tryParseStrategies(cleanedCode);

    return {
      cleanedCode,
      parseInfo,
      validationInfo
    };
  } catch (error) {
    console.error('Error in validateAndParseCode:', error);
    return {
      cleanedCode: code,
      parseInfo: { success: false, error: error.message },
      validationInfo: { success: false, error: error.message }
    };
  }
}

exports.validateAndParseCode = validateAndParseCode;

// New function to analyze code changes between commits
exports.analyzeCodeChanges = async (oldCode, newCode, filePath) => {
  try {
    // Validate inputs
    if (!oldCode || !newCode) {
      throw new Error('Both old and new code must be provided for comparison');
    }

    // Validate and parse both versions
    const { cleanedCode: cleanedOldCode, parseInfo: oldParseInfo } = await exports.validateAndParseCode(oldCode, filePath);
    const { cleanedCode: cleanedNewCode, parseInfo: newParseInfo } = await exports.validateAndParseCode(newCode, filePath);

    // Analyze both versions
    const oldAnalysis = await this.analyzeCode(cleanedOldCode, filePath);
    const newAnalysis = await this.analyzeCode(cleanedNewCode, filePath);

    // Calculate change metrics
    const scoreChange = newAnalysis.score - oldAnalysis.score;
    const metricsChange = {
      evalCount: newAnalysis.metrics.evalCount - oldAnalysis.metrics.evalCount,
      shortVarCount: newAnalysis.metrics.shortVarCount - oldAnalysis.metrics.shortVarCount,
      isMinified: newAnalysis.metrics.isMinified !== oldAnalysis.metrics.isMinified
    };

    // Calculate size change
    const sizeChange = cleanedNewCode.length - cleanedOldCode.length;
    const sizeChangePercent = (sizeChange / cleanedOldCode.length) * 100;

    return {
      oldAnalysis,
      newAnalysis,
      scoreChange,
      metricsChange,
      sizeChange,
      sizeChangePercent,
      changeType: scoreChange > 0 ? 'increased' : scoreChange < 0 ? 'decreased' : 'unchanged',
      parseInfo: {
        old: oldParseInfo,
        new: newParseInfo
      }
    };
  } catch (error) {
    console.error('Error analyzing code changes:', error);
    throw new Error(`Failed to analyze code changes: ${error.message}`);
  }
};