import * as ts from "typescript";
import {StringMutator} from "./string_mutator";
import {findClassInFile, findMethodOnClass} from "./util";
import {MethodEditor} from "./editors/method_editor";
import * as util from "./util";

export class VisitorContext extends StringMutator {

    public readonly ast : ts.SourceFile;
    public readonly checker : ts.TypeChecker;
    private editors : MethodEditor[];
    private service : ts.LanguageService;
    public util = util;
    public ts = ts;
    constructor(ast : ts.SourceFile, service : ts.LanguageService) {
        super(ast.text);
        this.ast = ast;
        this.service = service;
        this.checker = service.getProgram().getTypeChecker();
        this.editors = [];
    }

    public getMethodEditor(classNameOrNode : string|ts.ClassDeclaration, methodName : string) {

        let classNode : ts.ClassDeclaration = null;
        let className : string = null;
        if (typeof classNameOrNode === "string") {
            classNode = findClassInFile(this.ast, classNameOrNode);
            className = classNameOrNode;
        }
        else {
            classNode = classNameOrNode as ts.ClassDeclaration;
            className = classNode.name.getText();
        }
        for(let i = 0; i < this.editors.length; i++) {
            if(this.editors[i].className === className && this.editors[i].methodName === methodName) {
                return this.editors[i];
            }
        }
        const method = findMethodOnClass(classNode, methodName);
        if(method) {
            const editor = new MethodEditor(this, method.getEnd() - 1, className, methodName, false);
            this.editors.push(editor);
            return editor;
        }
        else {
            const editor = new MethodEditor(this, classNode.getEnd() - 1, className, methodName, true);
            this.editors.push(editor);
            return editor;
        }
    }

    public inject(classDeclaration : ts.ClassDeclaration, propertyDef : string) {
        this.insertLine(classDeclaration.getEnd() - 1, propertyDef);
    }

    // public isInheritedMethod(classNameOrNode : string|ts.ClassDeclaration, methodName : string) {
    //     let classNode : ts.ClassDeclaration = null;
    //     if (typeof classNameOrNode === "string") {
    //         classNode = findClassInFile(this.ast, classNameOrNode);
    //     }
    //     else {
    //         classNode = classNameOrNode as ts.ClassDeclaration;
    //     }
    //     const type = this.checker.getTypeAtLocation(classNode);
    //     if(!type) return false;
    //     // type.getBaseTypes()[0].
    //     return true;
    // }

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