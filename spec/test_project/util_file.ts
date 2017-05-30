import {UtilBaseClass} from "./util_file2";

declare var stuff : any;

namespace UtilNamespace {

    @stuff
    class UtilClass extends UtilBaseClass {

        public extProp0 : number;

        public thing() {}

        public static findMe() {}
    }

    interface UtilInterface {}
}

function inlineMe(n : number) {}


inlineMe(1);