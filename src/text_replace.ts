import {TextMutation} from "./text_mutation";

export class TextReplace extends TextMutation {

    constructor(start : number, end : number, content : string) {
        super(start, end, content);
        const replacedLength = end - start;
        if(replacedLength > content.length) {
            this.offset = content.length - replacedLength;
        }
        else {
            this.offset = replacedLength - content.length;
        }
    }

    public apply(text : string) {
        const start = text.substring(0, this.start);
        const end = text.substring(this.end, text.length);
        return start + this.content + end;
    }

}