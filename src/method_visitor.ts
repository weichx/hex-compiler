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
        return !ast.isDeclarationFile;
    }

    public filter(node : ts.Node) : boolean {
        return (node.kind & (ts.SyntaxKind.ClassDeclaration | ts.SyntaxKind.ModuleDeclaration)) !== 0;
    }

    public visit(node : ts.Node, context : VisitorContext) {
        if(node.kind === ts.SyntaxKind.ClassDeclaration) {
            const classDeclaration = node as ts.ClassDeclaration;
            this.applyClassMutators(context, classDeclaration);
            const methods = getMethodMembers(classDeclaration);
            const decoratedMethods = methods.filter(method => method.decorators);
            decoratedMethods.forEach(m => this.applyMethodMutators(context, classDeclaration, m));
        }
        else {
            ts.forEachChild(node, (childNode : ts.Node) => {
                this.visit(childNode, context);
            });
        }
    }

    private applyClassMutators(context : VisitorContext, classDeclaration : ts.ClassDeclaration) {
        if(!classDeclaration.decorators) return;
        for (let i = 0; i < this.mutators.length; i++) {
            const mutator = this.mutators[i];
            classDeclaration.decorators.forEach(function (decorator : ts.Decorator) {
                if (mutator.test(classDeclaration, null, decorator)) {
                    mutator.mutate(context, classDeclaration, null, decorator);
                }
            });
        }
    }

    private applyMethodMutators(context : VisitorContext, classDeclaration : ts.ClassDeclaration, method : ts.MethodDeclaration) {
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

