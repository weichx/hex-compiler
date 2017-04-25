"use strict";
exports.__esModule = true;
var ts = require("typescript");
var path = require("path");
var os = require("os");
var colors = require("colors/safe");
var file_data_1 = require("./file_data");
var decorator_visitor_1 = require("./decorator_visitor");
var visitor_context_1 = require("./visitor_context");
var scriptRegex = /\.tsx?$/i;
var CompilerHost = (function () {
    function CompilerHost(rootFiles) {
        this.rootFiles = rootFiles || [];
        this.files = {};
        this.outputMap = {};
        this.version = 0;
        this.options = null;
        this.postprocessors = new Array();
        this.decoratorMutators = [];
        this.service = ts.createLanguageService(this, ts.createDocumentRegistry());
        this.postprocessors.push(new decorator_visitor_1.DecoratorVisitor(this.decoratorMutators));
    }
    CompilerHost.prototype.initialize = function (configFilePath) {
        var _this = this;
        if (!configFilePath) {
            configFilePath = path.join(path.resolve("."), "tsconfig.json");
        }
        var configFile = ts.readConfigFile(configFilePath, ts.sys.readFile);
        if (configFile.error) {
            throw new Error(configFile.error.messageText);
        }
        var configParseResult = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configFilePath));
        this.options = configParseResult.options;
        this.rootFiles = this.rootFiles || configParseResult.fileNames;
        this.rootFiles.forEach(function (filePath) {
            var normalizedFilePath = path.resolve(path.normalize(filePath));
            _this.files[normalizedFilePath] = new file_data_1.FileData(normalizedFilePath);
        });
        return this;
    };
    CompilerHost.prototype.addDecoratorMutator = function (mutator) {
        this.decoratorMutators.push(mutator);
    };
    CompilerHost.prototype.getProjectVersion = function () {
        return this.version.toString();
    };
    CompilerHost.prototype.getCompilationSettings = function () {
        return this.options;
    };
    CompilerHost.prototype.getNewLine = function () {
        return os.EOL;
    };
    CompilerHost.prototype.getScriptFileNames = function () {
        var _this = this;
        return Object.keys(this.files).filter(function (f) {
            return _this.files[f].filePath.match(scriptRegex);
        });
    };
    CompilerHost.prototype.getScriptVersion = function (fileName) {
        fileName = path.normalize(fileName);
        return this.files[fileName] && this.files[fileName].getVersion();
    };
    CompilerHost.prototype.getScriptSnapshot = function (fileName) {
        fileName = path.normalize(fileName);
        var file = this.files[fileName] = this.files[fileName] || new file_data_1.FileData(fileName);
        if (!file.text)
            file.text = ts.sys.readFile(file.filePath);
        if (!file.text)
            return void 0;
        file.snapshot = file.snapshot || ts.ScriptSnapshot.fromString(file.text);
        return file.snapshot;
    };
    CompilerHost.prototype.getCurrentDirectory = function () {
        return process.cwd();
    };
    CompilerHost.prototype.getDefaultLibFileName = function (options) {
        return ts.getDefaultLibFilePath(options);
    };
    CompilerHost.prototype.log = function (message) {
        console.log(message);
    };
    CompilerHost.prototype.resolveModuleNames = function (moduleNames, containingFile) {
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
                console.log("Cant find ", normalizedPath);
                retn[i] = void 0;
            }
        }
        return retn;
    };
    CompilerHost.prototype.compileFile = function (filePath) {
        var file = this.files[filePath];
        var queue = [];
        var hasErrors = false;
        var outputMap = {};
        queue.push(file);
        for (var i = 0; i < file.forwardDependencies.length; i++) {
            delete this.outputMap[file.forwardDependencies[i].resolved];
        }
        //for(let i = 0; i < file.reverseDependencies.length; i++) {
        ////     delete this.outputMap[file.forwardDependencies[i].resolved];
        ////
        // }
        while (queue.length) {
            var file_1 = queue.pop();
            outputMap[file_1.filePath] = this.service.getEmitOutput(file_1.filePath);
            hasErrors = hasErrors || this.errorCheck(file_1);
            for (var j = 0; j < file_1.forwardDependencies.length; j++) {
                var depFile = this.files[file_1.forwardDependencies[j].resolved];
                if (!depFile) {
                    console.log(file_1.forwardDependencies[j].resolved);
                    continue;
                }
                if (!outputMap[depFile.filePath] && queue.indexOf(depFile) === -1) {
                    queue.push(depFile);
                }
            }
        }
        return hasErrors ? null : this.createOutput(outputMap);
    };
    CompilerHost.prototype.compile = function () {
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
                    console.log(file.forwardDependencies[j].resolved);
                    continue;
                }
                if (!outputMap[depFile.filePath] && queue.indexOf(depFile) === -1) {
                    queue.push(depFile);
                }
            }
        }
        return hasErrors ? null : this.createOutput(outputMap);
    };
    CompilerHost.prototype.createOutput = function (outputMap) {
        var finalFilePaths = Object.keys(outputMap);
        var retn = this.getHeader(finalFilePaths) + "([";
        for (var i = 0; i < finalFilePaths.length; i++) {
            var file = this.files[finalFilePaths[i]];
            var filePath = file.filePath;
            var output = outputMap[filePath];
            var text = output.outputFiles[0].text;
            text = this.replaceText(text, 'Object.defineProperty(exports, "__esModule", { value: true });', "");
            for (var j = 0; j < file.forwardDependencies.length; j++) {
                var dep = file.forwardDependencies[j];
                var targetString = "require(\"" + dep.raw + "\")";
                var replaced = "_require(" + finalFilePaths.indexOf(dep.resolved) + ")";
                text = this.replaceText(text, targetString, replaced);
            }
            retn += this.wrap(text);
            if (i !== finalFilePaths.length - 1) {
                retn += ",";
            }
        }
        retn += "])";
        return retn;
    };
    CompilerHost.prototype.errorCheck = function (file) {
        var diag = this.service.getSemanticDiagnostics(file.filePath)
            .concat(this.service.getSyntacticDiagnostics(file.filePath))
            .map(function (diagnostic) {
            var _a = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start), line = _a.line, character = _a.character;
            var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            console.error(colors.bgRed(diagnostic.file.fileName + " (" + (line + 1) + "," + (character + 1) + "): " + message));
        });
        return (diag.length > 0);
    };
    CompilerHost.prototype.replaceText = function (sourceText, targetString, replacedContent) {
        var idx = sourceText.indexOf(targetString);
        if (idx !== -1) {
            return sourceText.substring(0, idx) +
                replacedContent +
                sourceText.substring(idx + targetString.length);
        }
        return sourceText;
    };
    CompilerHost.prototype.getHeader = function (outputFilePaths) {
        var requireRoots = "";
        for (var i = 0; i < this.rootFiles.length; i++) {
            var file = this.files[this.rootFiles[i]];
            if (!file.isDefinition) {
                requireRoots += "requireModule(" + outputFilePaths.indexOf(this.rootFiles[i]) + ");\n";
            }
        }
        return "\n        (function(modules) {\n           const cache = {};\n           function requireModule(moduleId) {\n               if(!cache[moduleId]) {\n                   const module = cache[moduleId] = { exports: {} };\n                   modules[moduleId].call(module.exports, module, module.exports, requireModule);\n               }\n               return cache[moduleId].exports;\n           }\n           " + requireRoots + "\n        })";
    };
    CompilerHost.prototype.wrap = function (text) {
        return "function(module, exports, _require) {\n            " + text + "\n        }";
    };
    CompilerHost.prototype.postprocessVisitors = function () {
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
    return CompilerHost;
}());
exports.CompilerHost = CompilerHost;
