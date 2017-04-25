import {VisitorContext} from "../post_process_visitor";
import {findClassInFile, findMethodOnClass} from "../util";

export class AppendToOrCreatePrototypeMethod {

    public className : string;
    public methodName : string;
    public methodBody : string;

    constructor(className : string, methodName : string, methodBody : string) {
        this.className = className;
        this.methodName = methodName;
        this.methodBody = methodBody;
    }

    public apply(context : VisitorContext) {
        const classNode = findClassInFile(context.ast, this.className);
        if (classNode) {
            const methodNode = findMethodOnClass(classNode, this.methodName);
            if (methodNode) {
                context.insertLine(methodNode.getEnd(), this.methodBody);
            }
        }
    }

}