"use strict";
exports.__esModule = true;
var ts = require("typescript");
var path = require("path");
var os = require("os");
var colors = require("colors/safe");
var file_data_1 = require("./file_data");
var decorator_visitor_1 = require("./decorator_visitor");
var visitor_context_1 = require("./visitor_context");
var struct_visitor_1 = require("./struct_visitor");
struct_visitor_1.StructVisitor;
var scriptRegex = /\.tsx?$/i;
var Compiler = (function () {
    function Compiler(rootFiles, configFilePath) {
        this.rootFiles = rootFiles || [];
        this.files = {};
        this.outputMap = {};
        this.version = 0;
        this.options = null;
        this.postprocessors = new Array();
        this.decoratorMutators = [];
        this.service = ts.createLanguageService(this, ts.createDocumentRegistry());
        this.postprocessors.push(new decorator_visitor_1.DecoratorVisitor(this.decoratorMutators));
        this.initialize(configFilePath);
    }
    Compiler.prototype.initialize = function (configFilePath) {
        var _this = this;
        if (!configFilePath) {
            configFilePath = path.join(path.resolve("."), "tsconfig.json");
        }
        configFilePath = path.resolve(path.normalize(configFilePath));
        var configFile = ts.readConfigFile(configFilePath, ts.sys.readFile);
        if (configFile.error) {
            throw new Error(configFile.error.messageText);
        }
        var configParseResult = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configFilePath));
        this.options = configParseResult.options;
        this.rootFiles = this.rootFiles || configParseResult.fileNames;
        this.rootFiles.forEach(function (filePath, index) {
            var normalizedFilePath = path.resolve(path.normalize(filePath));
            _this.files[normalizedFilePath] = new file_data_1.FileData(normalizedFilePath);
            _this.rootFiles[index] = normalizedFilePath;
        });
        return this;
    };
    Compiler.prototype.addDecoratorMutator = function (mutator) {
        this.decoratorMutators.push(mutator);
    };
    Compiler.prototype.addVisitor = function (visitor) {
        this.postprocessors.push(visitor);
    };
    Compiler.prototype.getProjectVersion = function () {
        return this.version.toString();
    };
    Compiler.prototype.getCompilationSettings = function () {
        return this.options;
    };
    Compiler.prototype.getNewLine = function () {
        return os.EOL;
    };
    Compiler.prototype.getScriptFileNames = function () {
        var _this = this;
        return Object.keys(this.files).filter(function (f) {
            return _this.files[f].filePath.match(scriptRegex);
        });
    };
    Compiler.prototype.getScriptVersion = function (fileName) {
        fileName = path.normalize(fileName);
        return this.files[fileName] && this.files[fileName].getVersion();
    };
    Compiler.prototype.getScriptSnapshot = function (fileName) {
        fileName = path.normalize(fileName);
        var file = this.files[fileName] = this.files[fileName] || new file_data_1.FileData(fileName);
        if (!file.text)
            file.text = ts.sys.readFile(file.filePath);
        if (!file.text)
            return void 0;
        file.snapshot = file.snapshot || ts.ScriptSnapshot.fromString(file.text);
        return file.snapshot;
    };
    Compiler.prototype.getCurrentDirectory = function () {
        return process.cwd();
    };
    Compiler.prototype.getDefaultLibFileName = function (options) {
        return ts.getDefaultLibFilePath(options);
    };
    Compiler.prototype.log = function (message) {
        console.log(message);
    };
    Compiler.prototype.resolveModuleNames = function (moduleNames, containingFile) {
        var normalizedPath = path.normalize(containingFile);
        var file = this.files[normalizedPath];
        var retn = new Array(moduleNames.length);
        file.forwardDependencies.length = 0;
        for (var i = 0; i < moduleNames.length; i++) {
            var moduleName = moduleNames[i];
            var result = ts.resolveModuleName(moduleName, containingFile, this.options, ts.sys);
            if (result.resolvedModule) {
                retn[i] = result.resolvedModule;
                var resultPath = result.resolvedModule.resolvedFileName;
                file.reverseDependencies[resultPath] = true;
                file.forwardDependencies.push({ raw: moduleName, resolved: resultPath });
            }
            else {
                // console.log("Cant find ", normalizedPath);
                retn[i] = void 0;
            }
        }
        return retn;
    };
    Compiler.prototype.compile = function () {
        var filePaths = Object.keys(this.files);
        var outputMap = {};
        var queue = [];
        var hasErrors = false;
        for (var i = 0; i < filePaths.length; i++) {
            var file = this.files[filePaths[i]];
            if (!file.isDefinition) {
                queue.push(file);
            }
        }
        this.postprocessVisitors();
        while (queue.length) {
            var file = queue.pop();
            outputMap[file.filePath] = this.service.getEmitOutput(file.filePath);
            hasErrors = hasErrors || this.errorCheck(file);
            for (var j = 0; j < file.forwardDependencies.length; j++) {
                var depFile = this.files[file.forwardDependencies[j].resolved];
                if (!depFile) {
                    // console.log("cant find:", file.forwardDependencies[j].resolved);
                    continue;
                }
                if (!outputMap[depFile.filePath] && queue.indexOf(depFile) === -1) {
                    queue.push(depFile);
                }
            }
        }
        return hasErrors ? null : this.createOutput(outputMap);
    };
    //not sure if checker is available
    Compiler.prototype.compileChangedFiles = function () {
        var changedFiles = [];
        for (var i = 0; i < changedFiles.length; i++) {
            var file = changedFiles[i];
            file.text = ts.sys.readFile(file.filePath);
        }
        //createSourceFile
        //foreach changed file
        //run visitors & update file snapshot
        //get emit output for changed files
        var queue = [];
        var outputMap = {};
        var hasErrors = false;
        //also recompile everything the changed file touches
        while (queue.length) {
            var file = queue.pop();
            if (file.isTextDirty) {
                var compiledText = this.service.getEmitOutput(file.filePath);
            }
            else {
                outputMap[file.filePath] = file.compiledText;
            }
            hasErrors = hasErrors || this.errorCheck(file);
            for (var j = 0; j < file.forwardDependencies.length; j++) {
                var depFile = this.files[file.forwardDependencies[j].resolved];
                if (!depFile) {
                    console.log("cant find:", file.forwardDependencies[j].resolved);
                    continue;
                }
                if (!outputMap[depFile.filePath] && queue.indexOf(depFile) === -1) {
                    queue.push(depFile);
                }
            }
        }
    };
    Compiler.prototype.createOutput = function (outputMap) {
        var finalFilePaths = Object.keys(outputMap);
        var retn = this.getHeader(finalFilePaths) + "({";
        for (var i = 0; i < finalFilePaths.length; i++) {
            var file = this.files[finalFilePaths[i]];
            var filePath = file.filePath;
            var output = outputMap[filePath];
            if (output.outputFiles[0]) {
                var text_1 = output.outputFiles[0].text;
                text_1 = this.replaceText(text_1, 'Object.defineProperty(exports, "__esModule", { value: true });', "");
                for (var j = 0; j < file.forwardDependencies.length; j++) {
                    var dep = file.forwardDependencies[j];
                    var targetString = "require(\"" + dep.raw + "\")";
                    var replaced = "require(" + finalFilePaths.indexOf(dep.resolved) + ")";
                    text_1 = this.replaceText(text_1, targetString, replaced);
                }
                retn += this.wrap(i.toString(), text_1);
                if (i !== finalFilePaths.length - 1) {
                    retn += ",";
                }
            }
            else {
                //todo this isn't the best
                if (file.filePath.indexOf("node_modules") !== -1) {
                    if (filePath.indexOf("@types") !== -1) {
                        var lastSlash = file.filePath.lastIndexOf("/");
                        var baseFileName = path.basename(file.filePath.substring(0, lastSlash));
                        var fname = path.resolve(path.join("./node_modules", baseFileName, "dist", baseFileName + ".js"));
                        var text = ts.sys.readFile(fname);
                        retn += this.wrap(baseFileName, text);
                        var idx = finalFilePaths.indexOf(file.filePath);
                        if (idx !== -1) {
                            retn += "," + this.wrap(idx.toString(), "module.exports = require('" + baseFileName + "');");
                        }
                        if (i !== finalFilePaths.length - 1) {
                            retn += ",";
                        }
                    }
                    else {
                        var moduleIdx = filePath.indexOf("node_modules");
                        var fname = filePath.replace(".d.ts", ".js");
                        console.log(fname);
                        var text = ts.sys.readFile(fname);
                        retn += this.wrap(baseFileName, text);
                        var idx = finalFilePaths.indexOf(file.filePath);
                        if (idx !== -1) {
                            retn += "," + this.wrap(idx.toString(), "module.exports = require('" + baseFileName + "');");
                        }
                        if (i !== finalFilePaths.length - 1) {
                            retn += ",";
                        }
                    }
                }
                else {
                    console.log('cant find it' + file.filePath);
                }
            }
        }
        retn += "})";
        return retn;
    };
    Compiler.prototype.errorCheck = function (file) {
        var diag = this.service.getSemanticDiagnostics(file.filePath)
            .concat(this.service.getSyntacticDiagnostics(file.filePath))
            .map(function (diagnostic) {
            var _a = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start), line = _a.line, character = _a.character;
            var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            return {
                line: line, character: character, message: message, diagnostic: diagnostic
            };
        });
        if (diag.length > 0) {
            var printedErrors = {};
            for (var i = 0; i < diag.length; i++) {
                var d = diag[0];
                if (printedErrors[d.message]) {
                    continue;
                }
                printedErrors[d.message] = true;
                var line = d.line;
                var start = line > 5 ? line - 5 : 0;
                var end = start + 10;
                var split = d.diagnostic.file.getText().split("\n");
                var count = 1;
                var errorString = split.slice(start, end)
                    .map(function (l) { return (start + (++count)) + ":" + l; })
                    .join("\n");
                console.error(colors.bgRed(d.diagnostic.file.fileName + " (" + line + "," + d.character + "): " + d.message));
                console.log(colors.bgBlue(errorString));
            }
        }
        return (diag.length > 0);
    };
    Compiler.prototype.replaceText = function (sourceText, targetString, replacedContent) {
        var idx = sourceText.indexOf(targetString);
        if (idx !== -1) {
            return sourceText.substring(0, idx) +
                replacedContent +
                sourceText.substring(idx + targetString.length);
        }
        return sourceText;
    };
    Compiler.prototype.getHeader = function (outputFilePaths) {
        var requireRoots = "";
        for (var i = 0; i < this.rootFiles.length; i++) {
            var file = this.files[this.rootFiles[i]];
            if (!file.isDefinition) {
                requireRoots += "requireModule(" + outputFilePaths.indexOf(this.rootFiles[i]) + ");\n";
            }
        }
        return "\n        (function(modules) {\n           const cache = {};\n           function requireModule(moduleId) {\n               if(!cache[moduleId]) {\n                   const module = cache[moduleId] = { exports: {} };\n                   modules[moduleId].call(module.exports, module, module.exports, requireModule);\n               }\n               return cache[moduleId].exports;\n           }\n           " + requireRoots + "\n        })";
    };
    Compiler.prototype.wrap = function (name, text) {
        return "\"" + name + "\": function(module, exports, require) {\n            " + text + "\n        }";
    };
    Compiler.prototype.onFileChanged = function (filePath) {
        var file = this.files[filePath];
        var ast = this.service.getProgram().getSourceFile(filePath);
        //todo batch file changes
    };
    Compiler.prototype.runVisitors = function (fileData) {
        var ast = this.service.getProgram().getSourceFile(fileData.filePath);
        var context = new visitor_context_1.VisitorContext(ast, this.service);
        var file = this.files[ast.fileName];
        var statements = ast.statements;
        for (var i = 0; i < this.postprocessors.length; i++) {
            var visitor = this.postprocessors[i];
            if (!visitor.shouldVisitFile(ast)) {
                continue;
            }
            visitor.beforeVisit(ast, context);
            //todo as is we may not find things nested outside the root level
            for (var j = 0; j < statements.length; j++) {
                var statement = statements[j];
                if (visitor.filter(statement)) {
                    visitor.visit(statement, context);
                }
            }
            visitor.afterVisit(ast, context);
        }
        var newSource = context.applyMutations();
        if (newSource !== ast.text) {
            this.version++;
            file.version++;
            file.text = newSource;
            file.snapshot = ts.ScriptSnapshot.fromString(newSource);
        }
    };
    Compiler.prototype.postprocessVisitors = function () {
        var _this = this;
        this.service.getProgram().getSourceFiles().forEach(function (ast) {
            var context = new visitor_context_1.VisitorContext(ast, _this.service);
            var file = _this.files[ast.fileName];
            var statements = ast.statements;
            for (var i = 0; i < _this.postprocessors.length; i++) {
                var visitor = _this.postprocessors[i];
                if (!visitor.shouldVisitFile(ast)) {
                    continue;
                }
                visitor.beforeVisit(ast, context);
                //todo as is we may not find things nested outside the root level
                for (var j = 0; j < statements.length; j++) {
                    var statement = statements[j];
                    if (visitor.filter(statement)) {
                        visitor.visit(statement, context);
                    }
                }
                visitor.afterVisit(ast, context);
            }
            var newSource = context.applyMutations();
            if (newSource !== ast.text) {
                file.version++;
                file.text = newSource;
                file.snapshot = ts.ScriptSnapshot.fromString(newSource);
            }
        });
        this.version++;
    };
    return Compiler;
}());
exports.Compiler = Compiler;
