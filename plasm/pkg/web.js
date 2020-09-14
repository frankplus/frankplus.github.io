import { get_input_math_function } from './snippets/plasm-ab69fa809214a32c/main.js';

let wasm;

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

let cachegetFloat64Memory0 = null;
function getFloat64Memory0() {
    if (cachegetFloat64Memory0 === null || cachegetFloat64Memory0.buffer !== wasm.memory.buffer) {
        cachegetFloat64Memory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachegetFloat64Memory0;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory0;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

let WASM_VECTOR_LEN = 0;

let cachedTextEncoder = new TextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1 };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) wasm.__wbindgen_export_2.get(dtor)(a, state.b);
            else state.a = a;
        }
    };
    real.original = state;
    return real;
}
function __wbg_adapter_24(arg0, arg1) {
    wasm._dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h5cf9e7b9a6fec9b3(arg0, arg1);
}

function __wbg_adapter_27(arg0, arg1, arg2) {
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h21c7e4dfab0d7fbd(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_30(arg0, arg1, arg2) {
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h21c7e4dfab0d7fbd(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_33(arg0, arg1, arg2) {
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h21c7e4dfab0d7fbd(arg0, arg1, addHeapObject(arg2));
}

/**
*/
export function start() {
    wasm.start();
}

let cachegetFloat32Memory0 = null;
function getFloat32Memory0() {
    if (cachegetFloat32Memory0 === null || cachegetFloat32Memory0.buffer !== wasm.memory.buffer) {
        cachegetFloat32Memory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachegetFloat32Memory0;
}

function getArrayF32FromWasm0(ptr, len) {
    return getFloat32Memory0().subarray(ptr / 4, ptr / 4 + len);
}

function handleError(e) {
    wasm.__wbindgen_exn_store(addHeapObject(e));
}

async function load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {

        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

async function init(input) {
    if (typeof input === 'undefined') {
        input = import.meta.url.replace(/\.js$/, '_bg.wasm');
    }
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbindgen_cb_drop = function(arg0) {
        const obj = takeObject(arg0).original;
        if (obj.cnt-- == 1) {
            obj.a = 0;
            return true;
        }
        var ret = false;
        return ret;
    };
    imports.wbg.__wbg_getinputmathfunction_b6522182d0120aad = function(arg0) {
        var ret = get_input_math_function();
        var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbg_new_59cb74e423758ede = function() {
        var ret = new Error();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_stack_558ba5917b466edd = function(arg0, arg1) {
        var ret = getObject(arg1).stack;
        var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbg_error_4bb6c2a97407129a = function(arg0, arg1) {
        try {
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(arg0, arg1);
        }
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        var ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_cb_forget = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbg_instanceof_WebGl2RenderingContext_1f3735f620a46ed0 = function(arg0) {
        var ret = getObject(arg0) instanceof WebGL2RenderingContext;
        return ret;
    };
    imports.wbg.__wbg_bindBufferBase_a6d84a6c06b94d94 = function(arg0, arg1, arg2, arg3) {
        getObject(arg0).bindBufferBase(arg1 >>> 0, arg2 >>> 0, getObject(arg3));
    };
    imports.wbg.__wbg_bufferData_6549623b1921a65d = function(arg0, arg1, arg2, arg3) {
        getObject(arg0).bufferData(arg1 >>> 0, getObject(arg2), arg3 >>> 0);
    };
    imports.wbg.__wbg_drawBuffers_2be29d8b5d98a251 = function(arg0, arg1) {
        getObject(arg0).drawBuffers(getObject(arg1));
    };
    imports.wbg.__wbg_drawElementsInstanced_475055141db3bc9c = function(arg0, arg1, arg2, arg3, arg4, arg5) {
        getObject(arg0).drawElementsInstanced(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
    };
    imports.wbg.__wbg_framebufferTextureLayer_c1194f968f93d039 = function(arg0, arg1, arg2, arg3, arg4, arg5) {
        getObject(arg0).framebufferTextureLayer(arg1 >>> 0, arg2 >>> 0, getObject(arg3), arg4, arg5);
    };
    imports.wbg.__wbg_getUniformBlockIndex_51b25a9569f84e76 = function(arg0, arg1, arg2, arg3) {
        var ret = getObject(arg0).getUniformBlockIndex(getObject(arg1), getStringFromWasm0(arg2, arg3));
        return ret;
    };
    imports.wbg.__wbg_texStorage2D_2ed7f09869a82551 = function(arg0, arg1, arg2, arg3, arg4, arg5) {
        getObject(arg0).texStorage2D(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
    };
    imports.wbg.__wbg_texStorage3D_2c6cb4803ad68dec = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        getObject(arg0).texStorage3D(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5, arg6);
    };
    imports.wbg.__wbg_uniform3fv_a030145a2a2cf006 = function(arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform3fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
    };
    imports.wbg.__wbg_uniform4fv_8622468480219bfa = function(arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform4fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
    };
    imports.wbg.__wbg_uniformBlockBinding_ad29a8ce9a517f42 = function(arg0, arg1, arg2, arg3) {
        getObject(arg0).uniformBlockBinding(getObject(arg1), arg2 >>> 0, arg3 >>> 0);
    };
    imports.wbg.__wbg_uniformMatrix4fv_264cb4466dc3eb5b = function(arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).uniformMatrix4fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
    };
    imports.wbg.__wbg_vertexAttribDivisor_89541ccabfe941b3 = function(arg0, arg1, arg2) {
        getObject(arg0).vertexAttribDivisor(arg1 >>> 0, arg2 >>> 0);
    };
    imports.wbg.__wbg_activeTexture_a028007a12293386 = function(arg0, arg1) {
        getObject(arg0).activeTexture(arg1 >>> 0);
    };
    imports.wbg.__wbg_attachShader_305577eef1795451 = function(arg0, arg1, arg2) {
        getObject(arg0).attachShader(getObject(arg1), getObject(arg2));
    };
    imports.wbg.__wbg_bindBuffer_dd644867600dd01b = function(arg0, arg1, arg2) {
        getObject(arg0).bindBuffer(arg1 >>> 0, getObject(arg2));
    };
    imports.wbg.__wbg_bindFramebuffer_5f27ffdb03305489 = function(arg0, arg1, arg2) {
        getObject(arg0).bindFramebuffer(arg1 >>> 0, getObject(arg2));
    };
    imports.wbg.__wbg_bindTexture_0816769faad5e92e = function(arg0, arg1, arg2) {
        getObject(arg0).bindTexture(arg1 >>> 0, getObject(arg2));
    };
    imports.wbg.__wbg_blendFunc_71b4247f9d8b667e = function(arg0, arg1, arg2) {
        getObject(arg0).blendFunc(arg1 >>> 0, arg2 >>> 0);
    };
    imports.wbg.__wbg_clear_58479a778c092864 = function(arg0, arg1) {
        getObject(arg0).clear(arg1 >>> 0);
    };
    imports.wbg.__wbg_clearColor_949566ffaa5fb96c = function(arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).clearColor(arg1, arg2, arg3, arg4);
    };
    imports.wbg.__wbg_clearDepth_5091e1e8b357ca4d = function(arg0, arg1) {
        getObject(arg0).clearDepth(arg1);
    };
    imports.wbg.__wbg_compileShader_45710a0ce6f0c07c = function(arg0, arg1) {
        getObject(arg0).compileShader(getObject(arg1));
    };
    imports.wbg.__wbg_createBuffer_976d5f2090e9b4e8 = function(arg0) {
        var ret = getObject(arg0).createBuffer();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_createFramebuffer_2844bed8fed3dd71 = function(arg0) {
        var ret = getObject(arg0).createFramebuffer();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_createProgram_7dce303a3ca4aaec = function(arg0) {
        var ret = getObject(arg0).createProgram();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_createShader_4a9e685c994bbdae = function(arg0, arg1) {
        var ret = getObject(arg0).createShader(arg1 >>> 0);
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_createTexture_72648c03c7fa1750 = function(arg0) {
        var ret = getObject(arg0).createTexture();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_cullFace_204ae3248463e77e = function(arg0, arg1) {
        getObject(arg0).cullFace(arg1 >>> 0);
    };
    imports.wbg.__wbg_deleteBuffer_fa9b7d1fc74b9eb2 = function(arg0, arg1) {
        getObject(arg0).deleteBuffer(getObject(arg1));
    };
    imports.wbg.__wbg_deleteFramebuffer_fe8993e1e5385bc5 = function(arg0, arg1) {
        getObject(arg0).deleteFramebuffer(getObject(arg1));
    };
    imports.wbg.__wbg_deleteProgram_00d8b1ab1f94a057 = function(arg0, arg1) {
        getObject(arg0).deleteProgram(getObject(arg1));
    };
    imports.wbg.__wbg_deleteShader_0b8505937f2aa813 = function(arg0, arg1) {
        getObject(arg0).deleteShader(getObject(arg1));
    };
    imports.wbg.__wbg_deleteTexture_c92f0995e08d52d3 = function(arg0, arg1) {
        getObject(arg0).deleteTexture(getObject(arg1));
    };
    imports.wbg.__wbg_depthFunc_abd43070b296e107 = function(arg0, arg1) {
        getObject(arg0).depthFunc(arg1 >>> 0);
    };
    imports.wbg.__wbg_depthMask_f90aad71f0671037 = function(arg0, arg1) {
        getObject(arg0).depthMask(arg1 !== 0);
    };
    imports.wbg.__wbg_detachShader_624528ffe3ca5800 = function(arg0, arg1, arg2) {
        getObject(arg0).detachShader(getObject(arg1), getObject(arg2));
    };
    imports.wbg.__wbg_disable_74ac194a422c1fd4 = function(arg0, arg1) {
        getObject(arg0).disable(arg1 >>> 0);
    };
    imports.wbg.__wbg_disableVertexAttribArray_5bced174821c76dc = function(arg0, arg1) {
        getObject(arg0).disableVertexAttribArray(arg1 >>> 0);
    };
    imports.wbg.__wbg_drawArrays_6051def3c6695806 = function(arg0, arg1, arg2, arg3) {
        getObject(arg0).drawArrays(arg1 >>> 0, arg2, arg3);
    };
    imports.wbg.__wbg_drawElements_427ff273a1d052d9 = function(arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).drawElements(arg1 >>> 0, arg2, arg3 >>> 0, arg4);
    };
    imports.wbg.__wbg_enable_2343a48fd5cca209 = function(arg0, arg1) {
        getObject(arg0).enable(arg1 >>> 0);
    };
    imports.wbg.__wbg_enableVertexAttribArray_11b8883880c5dc6e = function(arg0, arg1) {
        getObject(arg0).enableVertexAttribArray(arg1 >>> 0);
    };
    imports.wbg.__wbg_generateMipmap_10e8263ef3d8e646 = function(arg0, arg1) {
        getObject(arg0).generateMipmap(arg1 >>> 0);
    };
    imports.wbg.__wbg_getActiveAttrib_3e64227752f91be1 = function(arg0, arg1, arg2) {
        var ret = getObject(arg0).getActiveAttrib(getObject(arg1), arg2 >>> 0);
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_getActiveUniform_e4416b8abb6f3181 = function(arg0, arg1, arg2) {
        var ret = getObject(arg0).getActiveUniform(getObject(arg1), arg2 >>> 0);
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_getAttribLocation_5aa1e2863d13fe61 = function(arg0, arg1, arg2, arg3) {
        var ret = getObject(arg0).getAttribLocation(getObject(arg1), getStringFromWasm0(arg2, arg3));
        return ret;
    };
    imports.wbg.__wbg_getExtension_cf6e48f769e60994 = function(arg0, arg1, arg2) {
        try {
            var ret = getObject(arg0).getExtension(getStringFromWasm0(arg1, arg2));
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__wbg_getProgramInfoLog_9a9b27354754fb8d = function(arg0, arg1, arg2) {
        var ret = getObject(arg1).getProgramInfoLog(getObject(arg2));
        var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbg_getProgramParameter_91518b8ba0773684 = function(arg0, arg1, arg2) {
        var ret = getObject(arg0).getProgramParameter(getObject(arg1), arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getShaderInfoLog_d35460ddd4fc5752 = function(arg0, arg1, arg2) {
        var ret = getObject(arg1).getShaderInfoLog(getObject(arg2));
        var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbg_getUniformLocation_34cdcb1c7d68bf1a = function(arg0, arg1, arg2, arg3) {
        var ret = getObject(arg0).getUniformLocation(getObject(arg1), getStringFromWasm0(arg2, arg3));
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_linkProgram_c6b3aa4d4b30a5e6 = function(arg0, arg1) {
        getObject(arg0).linkProgram(getObject(arg1));
    };
    imports.wbg.__wbg_shaderSource_0e9274d7500d354f = function(arg0, arg1, arg2, arg3) {
        getObject(arg0).shaderSource(getObject(arg1), getStringFromWasm0(arg2, arg3));
    };
    imports.wbg.__wbg_texParameteri_87fcd3e492a1e4dd = function(arg0, arg1, arg2, arg3) {
        getObject(arg0).texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
    };
    imports.wbg.__wbg_uniform1f_6e9ab56dc8f65c9e = function(arg0, arg1, arg2) {
        getObject(arg0).uniform1f(getObject(arg1), arg2);
    };
    imports.wbg.__wbg_uniform1i_9a7856dfa4d25de9 = function(arg0, arg1, arg2) {
        getObject(arg0).uniform1i(getObject(arg1), arg2);
    };
    imports.wbg.__wbg_useProgram_6201d054f7b93dbe = function(arg0, arg1) {
        getObject(arg0).useProgram(getObject(arg1));
    };
    imports.wbg.__wbg_vertexAttribPointer_b32d32aae9201729 = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        getObject(arg0).vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
    };
    imports.wbg.__wbg_viewport_08b88cd0ea10990b = function(arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).viewport(arg1, arg2, arg3, arg4);
    };
    imports.wbg.__wbg_instanceof_Window_a633dbe0900c728a = function(arg0) {
        var ret = getObject(arg0) instanceof Window;
        return ret;
    };
    imports.wbg.__wbg_document_07444f1bbea314bb = function(arg0) {
        var ret = getObject(arg0).document;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_innerWidth_ba3cbd32f1fd8d3d = function(arg0) {
        try {
            var ret = getObject(arg0).innerWidth;
            return addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__wbg_innerHeight_4e10b313a730bd8d = function(arg0) {
        try {
            var ret = getObject(arg0).innerHeight;
            return addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__wbg_performance_cc98652048194dbe = function(arg0) {
        var ret = getObject(arg0).performance;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_requestAnimationFrame_10a415a97fc2123f = function(arg0, arg1) {
        try {
            var ret = getObject(arg0).requestAnimationFrame(getObject(arg1));
            return ret;
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__wbg_deltaY_805737c4c72db5fe = function(arg0) {
        var ret = getObject(arg0).deltaY;
        return ret;
    };
    imports.wbg.__wbg_now_ce4a6a89baf241c9 = function(arg0) {
        var ret = getObject(arg0).now();
        return ret;
    };
    imports.wbg.__wbg_pageX_a8a212c3ea19fc82 = function(arg0) {
        var ret = getObject(arg0).pageX;
        return ret;
    };
    imports.wbg.__wbg_pageY_9cf38336fc756dce = function(arg0) {
        var ret = getObject(arg0).pageY;
        return ret;
    };
    imports.wbg.__wbg_length_473c2b3c01d5d0ac = function(arg0) {
        var ret = getObject(arg0).length;
        return ret;
    };
    imports.wbg.__wbg_item_32ba73f8b948ec60 = function(arg0, arg1) {
        var ret = getObject(arg0).item(arg1 >>> 0);
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_instanceof_HtmlCanvasElement_c6a06fc9a851a478 = function(arg0) {
        var ret = getObject(arg0) instanceof HTMLCanvasElement;
        return ret;
    };
    imports.wbg.__wbg_width_e29d6e8a5c409d12 = function(arg0) {
        var ret = getObject(arg0).width;
        return ret;
    };
    imports.wbg.__wbg_width_70cc14014c04df22 = function(arg0, arg1) {
        getObject(arg0).width = arg1 >>> 0;
    };
    imports.wbg.__wbg_height_f1097727b2ec35e1 = function(arg0) {
        var ret = getObject(arg0).height;
        return ret;
    };
    imports.wbg.__wbg_height_e962cc78d8658712 = function(arg0, arg1) {
        getObject(arg0).height = arg1 >>> 0;
    };
    imports.wbg.__wbg_getContext_2151b76e11a6eb39 = function(arg0, arg1, arg2) {
        try {
            var ret = getObject(arg0).getContext(getStringFromWasm0(arg1, arg2));
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__wbg_defaultPrevented_a9344c80f0f40d39 = function(arg0) {
        var ret = getObject(arg0).defaultPrevented;
        return ret;
    };
    imports.wbg.__wbg_preventDefault_a94db094b84ac446 = function(arg0) {
        getObject(arg0).preventDefault();
    };
    imports.wbg.__wbg_name_6b5fbd09f77bc774 = function(arg0, arg1) {
        var ret = getObject(arg1).name;
        var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbg_getElementById_633c94a971ae0eb9 = function(arg0, arg1, arg2) {
        var ret = getObject(arg0).getElementById(getStringFromWasm0(arg1, arg2));
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_debug_7020dcb48edf105b = function(arg0) {
        console.debug(getObject(arg0));
    };
    imports.wbg.__wbg_error_b23efba5bfb5cec5 = function(arg0) {
        console.error(getObject(arg0));
    };
    imports.wbg.__wbg_info_8ce99578d0b91a35 = function(arg0) {
        console.info(getObject(arg0));
    };
    imports.wbg.__wbg_log_c180b836187d3c94 = function(arg0) {
        console.log(getObject(arg0));
    };
    imports.wbg.__wbg_warn_942f927afebcc748 = function(arg0) {
        console.warn(getObject(arg0));
    };
    imports.wbg.__wbg_offsetWidth_ed3a253f3dff880a = function(arg0) {
        var ret = getObject(arg0).offsetWidth;
        return ret;
    };
    imports.wbg.__wbg_offsetHeight_db1ff3756282f7ff = function(arg0) {
        var ret = getObject(arg0).offsetHeight;
        return ret;
    };
    imports.wbg.__wbg_offsetX_aca50cabf6b6622b = function(arg0) {
        var ret = getObject(arg0).offsetX;
        return ret;
    };
    imports.wbg.__wbg_offsetY_6a241c1438478484 = function(arg0) {
        var ret = getObject(arg0).offsetY;
        return ret;
    };
    imports.wbg.__wbg_button_b117231e7deb32f9 = function(arg0) {
        var ret = getObject(arg0).button;
        return ret;
    };
    imports.wbg.__wbg_movementX_9163c09e17fc4d13 = function(arg0) {
        var ret = getObject(arg0).movementX;
        return ret;
    };
    imports.wbg.__wbg_movementY_c94184959d8bc252 = function(arg0) {
        var ret = getObject(arg0).movementY;
        return ret;
    };
    imports.wbg.__wbg_touches_31e57b268600cd1a = function(arg0) {
        var ret = getObject(arg0).touches;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_addEventListener_9f325a58d77d2781 = function(arg0, arg1, arg2, arg3) {
        try {
            getObject(arg0).addEventListener(getStringFromWasm0(arg1, arg2), getObject(arg3));
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__wbg_call_804d3ad7e8acd4d5 = function(arg0, arg1) {
        try {
            var ret = getObject(arg0).call(getObject(arg1));
            return addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
        var ret = getObject(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newnoargs_ebdc90c3d1e4e55d = function(arg0, arg1) {
        var ret = new Function(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_globalThis_48a5e9494e623f26 = function() {
        try {
            var ret = globalThis.globalThis;
            return addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__wbg_self_25067cb019cade42 = function() {
        try {
            var ret = self.self;
            return addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__wbg_window_9e80200b35aa30f8 = function() {
        try {
            var ret = window.window;
            return addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__wbg_global_7583a634265a91fc = function() {
        try {
            var ret = global.global;
            return addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
        var ret = getObject(arg0) === undefined;
        return ret;
    };
    imports.wbg.__wbg_buffer_f897a8d316863411 = function(arg0) {
        var ret = getObject(arg0).buffer;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_b65e1915b38bec8e = function(arg0) {
        var ret = new Uint32Array(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_4546c9674ba984b4 = function(arg0) {
        var ret = new Float32Array(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_subarray_0d384a3a4cfb3fa0 = function(arg0, arg1, arg2) {
        var ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_subarray_cb31efc6e4847e6e = function(arg0, arg1, arg2) {
        var ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_instanceof_Memory_7ccbf540b50fc2bf = function(arg0) {
        var ret = getObject(arg0) instanceof WebAssembly.Memory;
        return ret;
    };
    imports.wbg.__wbindgen_number_get = function(arg0, arg1) {
        const obj = getObject(arg1);
        var ret = typeof(obj) === 'number' ? obj : undefined;
        getFloat64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? 0 : ret;
        getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
    };
    imports.wbg.__wbindgen_boolean_get = function(arg0) {
        const v = getObject(arg0);
        var ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
        return ret;
    };
    imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
        var ret = debugString(getObject(arg1));
        var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbindgen_memory = function() {
        var ret = wasm.memory;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper280 = function(arg0, arg1, arg2) {
        var ret = makeMutClosure(arg0, arg1, 78, __wbg_adapter_24);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper425 = function(arg0, arg1, arg2) {
        var ret = makeMutClosure(arg0, arg1, 144, __wbg_adapter_33);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper423 = function(arg0, arg1, arg2) {
        var ret = makeMutClosure(arg0, arg1, 144, __wbg_adapter_27);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper427 = function(arg0, arg1, arg2) {
        var ret = makeMutClosure(arg0, arg1, 144, __wbg_adapter_30);
        return addHeapObject(ret);
    };

    if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
        input = fetch(input);
    }

    const { instance, module } = await load(await input, imports);

    wasm = instance.exports;
    init.__wbindgen_wasm_module = module;
    wasm.__wbindgen_start();
    return wasm;
}

export default init;

