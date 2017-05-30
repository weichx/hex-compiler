import {StringMutator} from "../string_mutator";

export class MethodEditor {

    public readonly className : string;
    public readonly methodName : string;
    public readonly context : StringMutator;
    public readonly statementList : Array<string>;
    public readonly isCreating : boolean;
    private start : number;

    constructor(context : StringMutator, start : number, className : string, methodName : string, isCreating : boolean) {
        this.context = context;
        this.start = start;
        this.className = className;
        this.methodName = methodName;
        this.statementList = [];
        this.isCreating = isCreating;
        if(isCreating) {
            this.statementList.push("public " + methodName + "() : void {\n");
        }
    }

    public addStatement(statement : string) {
        this.statementList.push(statement);
    }

    public buildMutations() {
        if(this.isCreating) {
            this.statementList.push("\n}\n");
        }
        this.context.insert(this.start, this.statementList.join(""));
    }

}