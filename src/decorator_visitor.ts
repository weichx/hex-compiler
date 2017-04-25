import * as ts from "typescript";
import {Visitor} from "./visitor";
import {IDecoratorMutator} from "./compiler";
import {getMethodMembers} from "./util";
import {VisitorContext} from "./visitor_context";

export class DecoratorVisitor extends Visitor {

    private mutators : Array<IDecoratorMutator>;

    constructor(mutators : IDecoratorMutator[]) {
        super();
        this.mutators = mutators;
    }

    public shouldVisitFile(ast : ts.SourceFile) : boolean {
        return true;
    }

    public filter(node : ts.Node) : boolean {
        return node.kind === ts.SyntaxKind.ClassDeclaration;
    }

    public visit(node : ts.Node, context : VisitorContext) {
        const classDeclaration = node as ts.ClassDeclaration;
        const methods = getMethodMembers(classDeclaration);
        const decoratedMethods = methods.filter(method => method.decorators);
        decoratedMethods.forEach(m => this.applyMutators(context, classDeclaration, m));
    }

    private applyMutators(context : VisitorContext, classDeclaration : ts.ClassDeclaration, method : ts.MethodDeclaration) {
        for (let i = 0; i < this.mutators.length; i++) {
            const mutator = this.mutators[i];
            method.decorators.forEach(function (decorator : ts.Decorator) {
                if (mutator.test(classDeclaration, method, decorator)) {
                    mutator.mutate(context, classDeclaration, method, decorator);
                }
            });
        }
    }

}

