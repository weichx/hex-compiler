import * as ts from "typescript";
import * as path from "path";
import * as os from "os";
import * as colors from "colors/safe";
import {Visitor} from "./visitor";
import {FileData} from "./file_data";
import {DecoratorVisitor} from "./decorator_visitor";
import {VisitorContext} from "./visitor_context";
import {StructVisitor} from "./struct_visitor";
StructVisitor;
// var x = new StructVisitor();
interface Indexable<T> {
    [idx : string] : T;
}

export interface IDecoratorMutator {
    test(classDeclaration : ts.ClassDeclaration, method : ts.MethodDeclaration, decorator : ts.Decorator) : boolean;
    mutate(context : VisitorContext, classDeclaration : ts.ClassDeclaration, method : ts.MethodDeclaration, decorator : ts.Decorator) : void;
}

const scriptRegex = /\.tsx?$/i;

export class Compiler implements ts.LanguageServiceHost {

    public version : number;
    public files : Indexable<FileData>;
    public options : ts.CompilerOptions;
    private postprocessors : Array<Visitor>;
    private service : ts.LanguageService;
    private rootFiles : string[];
    private outputMap : any;
    private decoratorMutators : Array<IDecoratorMutator>;

    constructor(rootFiles : string[], configFilePath? : string) {
        this.rootFiles = rootFiles || [];
        this.files = {};
        this.outputMap = {};
        this.version = 0;
        this.options = null;
        this.postprocessors = new Array<Visitor>();
        this.decoratorMutators = [];
        this.service = ts.createLanguageService(this, ts.createDocumentRegistry());
        this.postprocessors.push(new DecoratorVisitor(this.decoratorMutators));
        this.initialize(configFilePath)
    }

    private initialize(configFilePath? : string) : this {
        if (!configFilePath) {
            configFilePath = path.join(path.resolve("."), "tsconfig.json");
        }
        configFilePath = path.resolve(path.normalize(configFilePath));
        const configFile = ts.readConfigFile(configFilePath, ts.sys.readFile);
        if (configFile.error) {
            throw new Error(configFile.error.messageText as string);
        }

        const configParseResult = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configFilePath));
        this.options = configParseResult.options;
        this.rootFiles = this.rootFiles || configParseResult.fileNames;
        this.rootFiles.forEach((filePath : string, index : number) => {
            const normalizedFilePath = path.resolve(path.normalize(filePath));
            this.files[normalizedFilePath] = new FileData(normalizedFilePath);
            this.rootFiles[index] = normalizedFilePath;
        });
        return this;
    }

    public addDecoratorMutator(mutator : IDecoratorMutator) {
        this.decoratorMutators.push(mutator);
    }

    public addVisitor(visitor : Visitor) {
        this.postprocessors.push(visitor);
    }

    public getProjectVersion() {
        return this.version.toString();
    }

    public getCompilationSettings() : ts.CompilerOptions {
        return this.options;
    }

    public getNewLine() : string {
        return os.EOL;
    }

    public getScriptFileNames() : string[] {
        return Object.keys(this.files).filter(f => {
            return this.files[f].filePath.match(scriptRegex)
        });
    }

    public getScriptVersion(fileName : string) : string {
        fileName = path.normalize(fileName);
        return this.files[fileName] && this.files[fileName].getVersion();
    }

    public getScriptSnapshot(fileName : string) : ts.IScriptSnapshot {
        fileName = path.normalize(fileName);
        const file = this.files[fileName] = this.files[fileName] || new FileData(fileName);
        if (!file.text) file.text = ts.sys.readFile(file.filePath);
        if (!file.text) return void 0;
        file.snapshot = file.snapshot || ts.ScriptSnapshot.fromString(file.text);
        return file.snapshot
    }

    public getCurrentDirectory() : string {
        return process.cwd()
    }

    public getDefaultLibFileName(options : ts.CompilerOptions) : string {
        return ts.getDefaultLibFilePath(options)
    }

    public log(message : string) : void {
        console.log(message);
    }

    public resolveModuleNames(moduleNames : string[], containingFile : string) {
        const normalizedPath = path.normalize(containingFile);
        const file = this.files[normalizedPath];
        const retn = new Array<ts.ResolvedModule>(moduleNames.length);
        file.forwardDependencies.length = 0;
        for (let i = 0; i < moduleNames.length; i++) {
            const moduleName = moduleNames[i];
            let result = ts.resolveModuleName(moduleName, containingFile, this.options, ts.sys);
            if (result.resolvedModule) {
                retn[i] = result.resolvedModule;
                const resultPath = result.resolvedModule.resolvedFileName;
                file.reverseDependencies[resultPath] = true;
                file.forwardDependencies.push({ raw: moduleName, resolved: resultPath });
            }
            else {
                // console.log("Cant find ", normalizedPath);
                retn[i] = void 0;
            }

        }
        return retn;
    }

    public compile() {
        const filePaths = Object.keys(this.files);
        const outputMap : any = {};
        const queue : Array<FileData> = [];
        let hasErrors = false;

        for (let i = 0; i < filePaths.length; i++) {
            const file = this.files[filePaths[i]];
            if (!file.isDefinition) {
                queue.push(file);
            }
        }

        this.postprocessVisitors();

        while (queue.length) {
            const file = queue.pop();
            outputMap[file.filePath] = this.service.getEmitOutput(file.filePath);

            hasErrors = hasErrors || this.errorCheck(file);

            for (let j = 0; j < file.forwardDependencies.length; j++) {
                const depFile = this.files[file.forwardDependencies[j].resolved];
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
    }

    //not sure if checker is available
    public compileChangedFiles() {
        const changedFiles : Array<FileData> = [];
        for(let i = 0; i < changedFiles.length; i++) {
            const file = changedFiles[i];
            file.text = ts.sys.readFile(file.filePath);
        }
        //createSourceFile
        //foreach changed file
        //run visitors & update file snapshot
        //get emit output for changed files
        const queue : any = [];
        const outputMap : any = {};
        let hasErrors = false;
        //also recompile everything the changed file touches

        while (queue.length) {
            const file = queue.pop();
            if(file.isTextDirty) {
                const compiledText = this.service.getEmitOutput(file.filePath);
            }
            else {
                outputMap[file.filePath] = file.compiledText;
            }
            hasErrors = hasErrors || this.errorCheck(file);

            for (let j = 0; j < file.forwardDependencies.length; j++) {
                const depFile = this.files[file.forwardDependencies[j].resolved];
                if (!depFile) {
                    console.log("cant find:", file.forwardDependencies[j].resolved);
                    continue;
                }
                if (!outputMap[depFile.filePath] && queue.indexOf(depFile) === -1) {
                    queue.push(depFile);
                }
            }
        }
    }

    private createOutput(outputMap : Indexable<any>) : string {

        const finalFilePaths = Object.keys(outputMap);
        let retn = this.getHeader(finalFilePaths) + "({";

        for (let i = 0; i < finalFilePaths.length; i++) {

            const file = this.files[finalFilePaths[i]];
            const filePath = file.filePath;
            const output = outputMap[filePath];
            if(output.outputFiles[0]) {
                let text = output.outputFiles[0].text;
                text = this.replaceText(text, 'Object.defineProperty(exports, "__esModule", { value: true });', "");

                for (let j = 0; j < file.forwardDependencies.length; j++) {
                    const dep = file.forwardDependencies[j];
                    const targetString = `require("${dep.raw}")`;
                    const replaced = `require(${finalFilePaths.indexOf(dep.resolved)})`;
                    text = this.replaceText(text, targetString, replaced);
                }

                retn += this.wrap(i.toString(), text);
                if (i !== finalFilePaths.length - 1) {
                    retn += ",";
                }
            }
            else {
                //todo this isn't the best
                if(file.filePath.indexOf("node_modules") !== -1) {
                    if(filePath.indexOf("@types") !== -1) {
                        var lastSlash = file.filePath.lastIndexOf("/");
                        var baseFileName = path.basename(file.filePath.substring(0, lastSlash));
                        var fname = path.resolve(path.join("./node_modules", baseFileName, "dist", baseFileName + ".js"));
                        var text = ts.sys.readFile(fname);
                        retn += this.wrap(baseFileName, text);
                        var idx = finalFilePaths.indexOf(file.filePath);
                        if(idx !== -1) {
                            retn += "," + this.wrap(idx.toString(), `module.exports = require('${baseFileName}');`);
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
                        if(idx !== -1) {
                            retn += "," + this.wrap(idx.toString(), `module.exports = require('${baseFileName}');`);
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
    }

    private errorCheck(file : FileData) {
        const diag =
            this.service.getSemanticDiagnostics(file.filePath)
                .concat(this.service.getSyntacticDiagnostics(file.filePath))
                .map(diagnostic => {
                    let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
                    let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
                    return {
                        line, character, message, diagnostic
                    };
                });

        if(diag.length > 0) {
            var printedErrors : any = {};
            for(var i = 0; i <diag.length; i++) {
                var d = diag[0];
                if(printedErrors[d.message]) {
                    continue;
                }
                printedErrors[d.message] = true;
                var line = d.line;
                var start = line > 5 ? line - 5 : 0;
                var end = start + 10;
                var split = d.diagnostic.file.getText().split("\n");
                var count = 1;
                var errorString = split.slice(start, end)
                    .map(l => (start + (++count)) + ":" + l)
                    .join("\n");
                console.error(colors.bgRed(`${d.diagnostic.file.fileName} (${line},${d.character}): ${d.message}`));
                console.log(colors.bgBlue(errorString));
            }
        }
        return (diag.length > 0);
    }

    private replaceText(sourceText : string, targetString : string, replacedContent : string) {
        const idx = sourceText.indexOf(targetString);
        if (idx !== -1) {
            return sourceText.substring(0, idx) +
                replacedContent +
                sourceText.substring(idx + targetString.length);
        }
        return sourceText;
    }

    private getHeader(outputFilePaths : string[]) {
        let requireRoots = "";
        for (let i = 0; i < this.rootFiles.length; i++) {
            const file = this.files[this.rootFiles[i]];
            if (!file.isDefinition) {
                requireRoots += `requireModule(${outputFilePaths.indexOf(this.rootFiles[i])});\n`;
            }
        }
        return `
        (function(modules) {
           const cache = {};
           function requireModule(moduleId) {
               if(!cache[moduleId]) {
                   const module = cache[moduleId] = { exports: {} };
                   modules[moduleId].call(module.exports, module, module.exports, requireModule);
               }
               return cache[moduleId].exports;
           }
           ${requireRoots}
        })`;
    }

    private wrap(name : string, text : string) {
        return `"${name}": function(module, exports, require) {
            ${text}
        }`;
    }

    public onFileChanged(filePath : string) {
        const file = this.files[filePath];
        const ast = this.service.getProgram().getSourceFile(filePath);

        //todo batch file changes
    }

    private runVisitors(fileData : FileData) {
        const ast = this.service.getProgram().getSourceFile(fileData.filePath);
        const context = new VisitorContext(ast, this.service);
        const file = this.files[ast.fileName];

        const statements = ast.statements;

        for (let i = 0; i < this.postprocessors.length; i++) {
            const visitor = this.postprocessors[i];

            if (!visitor.shouldVisitFile(ast)) {
                continue;
            }

            visitor.beforeVisit(ast, context);
            //todo as is we may not find things nested outside the root level

            for (let j = 0; j < statements.length; j++) {
                const statement = statements[j];
                if (visitor.filter(statement)) {
                    visitor.visit(statement, context);
                }
            }

            visitor.afterVisit(ast, context);
        }

        const newSource = context.applyMutations();
        if (newSource !== ast.text) {
            this.version++;
            file.version++;
            file.text = newSource;
            file.snapshot = ts.ScriptSnapshot.fromString(newSource);
        }
    }

    private postprocessVisitors() {
        this.service.getProgram().getSourceFiles().forEach((ast : ts.SourceFile) => {

            const context = new VisitorContext(ast, this.service);
            const file = this.files[ast.fileName];

            const statements = ast.statements as Array<ts.Node>;

            for (let i = 0; i < this.postprocessors.length; i++) {
                const visitor = this.postprocessors[i];

                if (!visitor.shouldVisitFile(ast)) {
                    continue;
                }

                visitor.beforeVisit(ast, context);
                //todo as is we may not find things nested outside the root level

                for (let j = 0; j < statements.length; j++) {
                    const statement = statements[j];
                    if (visitor.filter(statement)) {
                        visitor.visit(statement, context);
                    }
                }

                visitor.afterVisit(ast, context);
            }

            const newSource = context.applyMutations();
            if (newSource !== ast.text) {
                file.version++;
                file.text = newSource;
                file.snapshot = ts.ScriptSnapshot.fromString(newSource);
            }
        });

        this.version++;

    }

}