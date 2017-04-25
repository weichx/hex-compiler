"use strict";
exports.__esModule = true;
var TextMutation = (function () {
    function TextMutation(start, end, content) {
        this.start = start;
        if (end < start)
            this.end = start;
        else
            this.end = end;
        this.offset = this.end - this.start;
        this.content = content;
    }
    TextMutation.prototype.apply = function (text) {
        var start = text.substring(0, this.start);
        var end = text.substring(this.start, text.length);
        return start + this.content + end;
    };
    TextMutation.prototype.overlaps = function (range) {
        return ((this.start > range.start && this.start <= range.end) ||
            (this.end >= range.start && this.end <= range.end));
    };
    return TextMutation;
}());
exports.TextMutation = TextMutation;
