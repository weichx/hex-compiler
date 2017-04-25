import * as ts from "typescript";

interface Indexable<T> {
    [idx : string] : T;
}

const dtsRegex = /\.d\.ts$/i;

export class FileData {

    public filePath : string;
    public text : string;
    public version : number;
    public isScriptFile : boolean;
    public forwardDependencies : Array<{ raw : string, resolved : string }>;
    public reverseDependencies : Indexable<boolean>;
    public snapshot : ts.IScriptSnapshot;
    public isTextDirty : boolean;
    public isDefinition : boolean;
    public sourceMap : string;
    public outputJS : string;

    constructor(filePath : string) {
        this.filePath = filePath;
        this.version = 0;
        this.text = "";
        this.isScriptFile = true;
        this.forwardDependencies = [];
        this.reverseDependencies = {};
        this.snapshot = null;
        this.isTextDirty = true;
        this.isDefinition = dtsRegex.test(filePath);
    }

    public getVersion() {
        return this.version.toString();
    }

}
