import * as ts from "typescript";
import {StringMutator} from "./string_mutator";

export class PreProcessVisitor {

    public shouldVisitFile(ast : ts.SourceFile) : boolean {
        return false;
    }

    public filter(node : ts.Node) : boolean {
        return false;
    }

    public beforeVisit(ast : ts.SourceFile, context : PreProcessVisitorContext) {}

    public visit(node : ts.Node, context : PreProcessVisitorContext) {}

    public afterVisit(ast : ts.SourceFile, context : PreProcessVisitorContext) {}

}

export class PreProcessVisitorContext extends StringMutator {

    public readonly ast : ts.SourceFile;

    constructor(ast : ts.SourceFile) {
        super(ast.text);
        this.ast = ast;
    }

}