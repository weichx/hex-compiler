import {StringMutator} from "../string_mutator";

export class MethodEditor {

    private methodName : string;
    private context : StringMutator;
    private start : number;
    private statementList : Array<string>;
    private isCreating : boolean;
    constructor(context : StringMutator, start : number, methodName : string, isCreating : boolean) {
        this.context = context;
        this.start = start;
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