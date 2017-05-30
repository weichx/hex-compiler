import * as ts from "typescript";
import {VisitorContext} from "./visitor_context";

export class Visitor {

    public shouldVisitFile(ast : ts.SourceFile) : boolean {
        return true;
    }

    public filter(node : ts.Node) : boolean {
        return false;
    }

    public beforeVisit(ast : ts.SourceFile, context : VisitorContext) {}

    public visit(node : ts.Node, context : VisitorContext) {}

    public afterVisit(ast : ts.SourceFile, context : VisitorContext) {}

}

