

function test() {
    var table = new Int32Array(1);
    var offset = 1;
    const x = __inline_struct<EntityStruct>(table, offset + 12);
    const y2 = __inline_struct<TestStruct>(table, offset + 12);

    var ENTITY_STRUCT_SIZE = x.size;
    var TEST_EMPTY_STRUCT_SIZE = y2.size;

    var z = 1;
    var w = x.id;
    const w2 = x.type;
    z = x.id;
    x.id = 1.5;
    x.type = ("hello" as any);
    // x.id += 1;
    // x.type = 12;


}

declare function fn(a : any) : any;
//not allowed
// export const x = __inline_struct<EntityStruct>(null, null);


declare class Struct {
    __struct_type_check__: "compile_assertion";
    readonly size : number;
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
    type : u16; //number;
}

declare class TestStruct extends Struct {

}

declare function __inline_struct<T extends Struct>(table : Float32Array|Uint32Array|Int32Array, offset : number) : T;

