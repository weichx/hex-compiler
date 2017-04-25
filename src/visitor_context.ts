import * as ts from "typescript";
import {StringMutator} from "./string_mutator";
import {findClassInFile, findMethodOnClass} from "./util";
import {MethodEditor} from "./editors/method_editor";

export class VisitorContext extends StringMutator {

    public readonly ast : ts.SourceFile;
    public readonly checker : ts.TypeChecker;
    private editors : MethodEditor[];
    private service : ts.LanguageService;

    constructor(ast : ts.SourceFile, service : ts.LanguageService) {
        super(ast.text);
        this.ast = ast;
        this.service = service;
        this.checker = service.getProgram().getTypeChecker();
        this.editors = [];
    }

    public getMethodEditor(classNameOrNode : string|ts.ClassDeclaration, methodName : string) {
        let classNode : ts.ClassDeclaration = null;
        if (typeof classNameOrNode === "string") {
            classNode = findClassInFile(this.ast, classNameOrNode);
        }
        else {
            classNode = classNameOrNode as ts.ClassDeclaration;
        }
        const method = findMethodOnClass(classNode, methodName);
        if(method) {
            const editor = new MethodEditor(this, method.getEnd() - 1, methodName, false);
            this.editors.push(editor);
            return editor;
        }
        else {
            const editor = new MethodEditor(this, classNode.getEnd() - 1, methodName, true);
            this.editors.push(editor);
            return editor;
        }

    }

    public applyBodyMutations() {
        for(let i = 0; i < this.editors.length; i++) {
            this.editors[i].buildMutations();
        }
        super.applyBodyMutations();
    }

    public removeNode(node : ts.Node) {
        this.remove(node.getStart(), node.getEnd());
    }

    public getNodeName(node : ts.Node) {
        let name = (node as any).name;
        if(name) {
            return name.getText();
        }
        else {
            return null;
        }
    }

}