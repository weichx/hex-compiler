import * as ts from "typescript";
import * as path from "path";
import * as os from "os";
import * as colors from "colors/safe";

import {Visitor} from "./visitor";
import {PreProcessVisitor, PreProcessVisitorContext} from "./pre_process_visitor";
import {FileData} from "./file_data";
import {DecoratorVisitor} from "./decorator_visitor";
import {VisitorContext} from "./visitor_context";

interface Indexable<T> {
    [idx : string] : T;
}

export interface IDecoratorMutator {
    test(classDeclaration : ts.ClassDeclaration, method : ts.MethodDeclaration, decorator : ts.Decorator) : boolean;
    mutate(context : VisitorContext, classDeclaration : ts.ClassDeclaration, method : ts.MethodDeclaration, decorator : ts.Decorator) : void;
}

const scriptRegex = /\.tsx?$/i;

export class CompilerHost implements ts.LanguageServiceHost {

    public version : number;
    public files : Indexable<FileData>;
    public options : ts.CompilerOptions;
    private postprocessors : Array<Visitor>;
    private service : ts.LanguageService;
    private rootFiles : string[];
    private outputMap : any;
    private decoratorMutators : Array<IDecoratorMutator>;

    constructor(rootFiles : string[]) {
        this.rootFiles = rootFiles || [];
        this.files = {};
        this.outputMap = {};
        this.version = 0;
        this.options = null;
        this.postprocessors = new Array<Visitor>();
        this.decoratorMutators = [];
        this.service = ts.createLanguageService(this, ts.createDocumentRegistry());
        this.postprocessors.push(new DecoratorVisitor(this.decoratorMutators));
    }

    public initialize(configFilePath? : string) : this {
        if (!configFilePath) {
            configFilePath = path.join(path.resolve("."), "tsconfig.json");
        }
        const configFile = ts.readConfigFile(configFilePath, ts.sys.readFile);
        if (configFile.error) {
            throw new Error(configFile.error.messageText as string);
        }

        const configParseResult = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configFilePath));
        this.options = configParseResult.options;
        this.rootFiles = this.rootFiles || configParseResult.fileNames;
        this.rootFiles.forEach(filePath => {
            const normalizedFilePath = path.resolve(path.normalize(filePath));
            this.files[normalizedFilePath] = new FileData(normalizedFilePath);
        });
        return this;
    }

    public addDecoratorMutator(mutator : IDecoratorMutator) {
        this.decoratorMutators.push(mutator);
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
                console.log("Cant find ", normalizedPath);
                retn[i] = void 0;
            }

        }
        return retn;
    }

    public compileFile(filePath : string) {
        const file = this.files[filePath];
        const queue : Array<FileData> = [];
        let hasErrors = false;
        const outputMap : any = {};

        queue.push(file);

        for (let i = 0; i < file.forwardDependencies.length; i++) {
            delete this.outputMap[file.forwardDependencies[i].resolved];
        }

        //for(let i = 0; i < file.reverseDependencies.length; i++) {
        ////     delete this.outputMap[file.forwardDependencies[i].resolved];
        ////
        // }

        while (queue.length) {
            const file = queue.pop();
            outputMap[file.filePath] = this.service.getEmitOutput(file.filePath);

            hasErrors = hasErrors || this.errorCheck(file);

            for (let j = 0; j < file.forwardDependencies.length; j++) {
                const depFile = this.files[file.forwardDependencies[j].resolved];
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
                    console.log(file.forwardDependencies[j].resolved);
                    continue;
                }
                if (!outputMap[depFile.filePath] && queue.indexOf(depFile) === -1) {
                    queue.push(depFile);
                }
            }
        }

        return hasErrors ? null : this.createOutput(outputMap);
    }

    private createOutput(outputMap : Indexable<any>) : string {

        const finalFilePaths = Object.keys(outputMap);
        let retn = this.getHeader(finalFilePaths) + "([";

        for (let i = 0; i < finalFilePaths.length; i++) {

            const file = this.files[finalFilePaths[i]];
            const filePath = file.filePath;
            const output = outputMap[filePath];
            let text = output.outputFiles[0].text;
            text = this.replaceText(text, 'Object.defineProperty(exports, "__esModule", { value: true });', "");

            for (let j = 0; j < file.forwardDependencies.length; j++) {
                const dep = file.forwardDependencies[j];
                const targetString = `require("${dep.raw}")`;
                const replaced = `_require(${finalFilePaths.indexOf(dep.resolved)})`;
                text = this.replaceText(text, targetString, replaced);
            }

            retn += this.wrap(text);
            if (i !== finalFilePaths.length - 1) {
                retn += ",";
            }
        }

        retn += "])";

        return retn;
    }

    private errorCheck(file : FileData) {
        const diag =
            this.service.getSemanticDiagnostics(file.filePath)
                .concat(this.service.getSyntacticDiagnostics(file.filePath))
                .map(diagnostic => {
                    let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
                    let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
                    console.error(colors.bgRed(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`));
                });

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

    private wrap(text : string) {
        return `function(module, exports, _require) {
            ${text}
        }`;
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