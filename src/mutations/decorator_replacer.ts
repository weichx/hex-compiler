import * as ts from "typescript";
import {VisitorContext} from "../post_process_visitor";

export class DecoratorReplacer {

    public classNode : ts.ClassDeclaration;

    constructor(classNode : ts.ClassDeclaration) {
        this.classNode = classNode;
    }

    public test(method : ts.MethodDeclaration, decorator : ts.Decorator) : boolean {
        return false;
    }

    public applyReplacement(context : VisitorContext, decorator : ts.Decorator) {
    }

}