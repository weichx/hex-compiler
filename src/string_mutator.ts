import {TextMutation} from "./text_mutation";
import {TextReplace} from "./text_replace";

export class StringMutator {

    protected text : string;
    protected prependStrings : string[];
    protected appendStrings : string[];
    protected mutations : Array<TextMutation>;

    constructor(text : string) {
        this.text = text;
        this.prependStrings = [];
        this.appendStrings = [];
        this.mutations = [];
    }

    public insertLine(position : number, str : string) : void {
        this.insert(position, str + '\n');
    }

    public insert(position : number, str : string) : void {
        this.addMutation(new TextMutation(position, position + str.length, str));
    }

    public replace(start : number, end : number, str : string) : void {
        this.addMutation(new TextReplace(start, end, str));
    }

    public remove(start : number, end : number) : void {
        this.replace(start, end, "");
    }

    public prepend(str : string) : void {
        this.prependStrings.push(str);
    }

    public prependLine(str : string) : void {
        this.prependStrings.push(str + "\n");
    }

    public append(str : string) : void {
        this.appendStrings.push(str);
    }

    public appendLine(str : string) : void {
        this.appendStrings.push(str + "\n");
    }

    public addMutation(mutation : TextMutation) {

        const invalid = (
            mutation.start < 0 ||
            mutation.start > this.text.length - 1 ||
            mutation.end < 0 ||
            mutation.end < mutation.start
        );

        if (invalid) {
            throw new Error("Mutation is invalid! " + JSON.stringify(mutation, null, 4));
        }

        for (let i = 0; i < this.mutations.length; i++) {
            if (this.mutations[i].overlaps(mutation)) {
                throw new Error("Mutations overlap! " +
                    JSON.stringify(this.mutations[i], null, 4) +
                    JSON.stringify(mutation, null, 4));
            }
        }

        this.mutations.push(mutation);
    }

    public applyMutations() : string {

        this.applyBodyMutations();
        //if no actions overlap this is easy to solve, if they do then we need to re-parse after each action
        return this.prependStrings.join("") + this.text + this.appendStrings.join("");
    }

    protected applyBodyMutations() {
        this.mutations.sort(function (m0 : TextMutation, m1 : TextMutation) {
            if (m0.start > m1.start) return 1;
            if (m0.start === m1.start) return 0;
            return -1;
        });

        while (this.mutations.length) {

            const mutation = this.mutations.shift();
            this.text = mutation.apply(this.text);//
            this.offsetMutations(mutation.offset);

        }
    }

    private offsetMutations(offset : number) {
        for (let i = 0; i < this.mutations.length; i++) {
            const mutation = this.mutations[i];
            mutation.start += offset;
            mutation.end += offset;
        }
    }

}