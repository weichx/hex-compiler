import {TextMutation} from "./text_mutation";

export class TextReplace extends TextMutation {

    constructor(start : number, end : number, content : string) {
        super(start, end, content);
        const replacedLength = end - start;
        this.offset = content.length - replacedLength;
        //
        // if(replacedLength < content.length) {
        // }
        // else {
        //     this.offset = content.length - replacedLength;
        // }
    }

    public apply(text : string) {
        const start = text.substring(0, this.start);
        const end = text.substring(this.end, text.length);
        return start + this.content + end;
    }

}