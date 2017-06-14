
function t2() {
    function test() {
        var table = new Int32Array(1);
        var offset = 1;
       //  for (var i = 0; i < 100; i++) {
       //      const z = __inline_struct<EntityStruct>(table, i);
       //  }
       // const x = __inline_struct<EntityStruct>(table, offset + 12);
       //  const y2 = __inline_struct<TestStruct>(table, offset + 12);
        const y3 = __struct<EntityStruct>(table, 2);
       //  var z = y3.type;
       //  var w = x.id;
       //  const w2 = x.type;
       //  z = x.id;
       //  x.id = 1.5;
       //  x.type = ("hello" as any);
        // x.id += 1;
        // x.type = 12;
        __struct<EntityStruct>(table, 6).tagType++;
        const x = __debugStruct<EntityStruct>(table, 5);
        offset++;
        var SIZE_THINGY = __sizeof<EntityStruct>();
        var stuff = __struct<EntityStruct>(table, 6).tagType++;

    }
}

type integer = number;

declare class Struct {
    __struct_type_check__: "compile_assertion";
    protected constructor();
}

declare var union : any;

type u32 = number;
type u24 = number;
type u16 = number;
type u8 = number;
type u4 = number;
type u1 = number;

declare class EntityStruct extends Struct {
    id : u16;
    uiElementId : u16;
    tagType: number;
    type : number;
}

declare class TestStruct extends Struct {

}

declare function __struct<T extends Struct>(table : {[index : number] : number}, index : integer) : T;
declare function __debugStruct<T extends Struct>(table : {[index : number] : number}, index : integer) : T;

declare function __inline_struct<T extends Struct>(table : Float32Array|Uint32Array|Int32Array, offset : number) : T;

declare function __sizeof<T extends Struct>() : number;