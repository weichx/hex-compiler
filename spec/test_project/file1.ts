function methodDecorator1(target : object, key : string) {

}

export class File1Class {

    @methodDecorator1
    public decoratedMethod1() {}

    public get propertyAccessor1() : number {
        return 10101010;
    }

}


var x = new File1Class();
var z = x.propertyAccessor1;
x.decoratedMethod1();