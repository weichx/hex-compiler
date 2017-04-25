export class TextMutation {

    public content : string;
    public start : number;
    public end : number;
    public offset : number;

    constructor(start : number, end : number, content : string) {
        this.start = start;
        if (end < start) this.end = start;
        else this.end = end;
        this.offset = this.end - this.start;
        this.content = content;
    }

    public apply(text : string) {
        const start = text.substring(0, this.start);
        const end = text.substring(this.start, text.length);
        return start + this.content + end;
    }

    public overlaps(range : TextMutation) : boolean {
        return (
            (this.start > range.start && this.start <= range.end) ||
            (this.end >= range.start && this.end <= range.end)
        );
    }

}