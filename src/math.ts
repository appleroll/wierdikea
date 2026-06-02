export type Vec3 = [number, number, number];

export const Vec3 = {
    add: (a: Vec3, b: Vec3): Vec3 => [a[0]+b[0], a[1]+b[1], a[2]+b[2]],
    sub: (a: Vec3, b: Vec3): Vec3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]],
    mul: (a: Vec3, s: number): Vec3 => [a[0]*s, a[1]*s, a[2]*s],
    cross: (a: Vec3, b: Vec3): Vec3 => [
        a[1]*b[2] - a[2]*b[1],
        a[2]*b[0] - a[0]*b[2],
        a[0]*b[1] - a[1]*b[0]
    ],
    normalize: (a: Vec3): Vec3 => {
        const len = Math.hypot(a[0], a[1], a[2]);
        return len > 0 ? [a[0]/len, a[1]/len, a[2]/len] : [0,0,0];
    }
};

export const Mat4 = {
    identity: () => new Float32Array([
        1,0,0,0,  0,1,0,0,  0,0,1,0,  0,0,0,1
    ]),
    multiply: (a: Float32Array, b: Float32Array) => {
        const out = new Float32Array(16);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                out[i + j*4] = a[i + 0*4]*b[0 + j*4] + a[i + 1*4]*b[1 + j*4] + a[i + 2*4]*b[2 + j*4] + a[i + 3*4]*b[3 + j*4];
            }
        }
        return out;
    },
    translation: (t: Vec3) => new Float32Array([
        1,0,0,0, 0,1,0,0, 0,0,1,0, t[0],t[1],t[2],1
    ]),
    scaling: (s: Vec3) => new Float32Array([
        s[0],0,0,0, 0,s[1],0,0, 0,0,s[2],0, 0,0,0,1
    ]),
    perspective: (fov: number, aspect: number, near: number, far: number) => {
        const f = 1.0 / Math.tan(fov / 2);
        return new Float32Array([
            f/aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far+near)/(near-far), -1,
            0, 0, (2*far*near)/(near-far), 0
        ]);
    },
    lookAt: (eye: Vec3, center: Vec3, up: Vec3) => {
        const f = Vec3.normalize(Vec3.sub(center, eye));
        const s = Vec3.normalize(Vec3.cross(f, up));
        const u = Vec3.cross(s, f);
        return new Float32Array([
            s[0], u[0], -f[0], 0,
            s[1], u[1], -f[1], 0,
            s[2], u[2], -f[2], 0,
            -s[0]*eye[0] - s[1]*eye[1] - s[2]*eye[2],
            -u[0]*eye[0] - u[1]*eye[1] - u[2]*eye[2],
             f[0]*eye[0] + f[1]*eye[1] + f[2]*eye[2],
            1
        ]);
    }
};
export const invertMat4 = (m: Float32Array) => {
    let out = new Float32Array(16);
    let a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
    let a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    let a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
    let a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

    let b00 = a00 * a11 - a01 * a10;
    let b01 = a00 * a12 - a02 * a10;
    let b02 = a00 * a13 - a03 * a10;
    let b03 = a01 * a12 - a02 * a11;
    let b04 = a01 * a13 - a03 * a11;
    let b05 = a02 * a13 - a03 * a12;
    let b06 = a20 * a31 - a21 * a30;
    let b07 = a20 * a32 - a22 * a30;
    let b08 = a20 * a33 - a23 * a30;
    let b09 = a21 * a32 - a22 * a31;
    let b10 = a21 * a33 - a23 * a31;
    let b11 = a22 * a33 - a23 * a32;

    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return null;
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
}

export const multiplyVec4 = (m: Float32Array, v: [number, number, number, number]): [number, number, number, number] => {
    return [
        m[0]*v[0] + m[4]*v[1] + m[8]*v[2] + m[12]*v[3],
        m[1]*v[0] + m[5]*v[1] + m[9]*v[2] + m[13]*v[3],
        m[2]*v[0] + m[6]*v[1] + m[10]*v[2] + m[14]*v[3],
        m[3]*v[0] + m[7]*v[1] + m[11]*v[2] + m[15]*v[3]
    ];
}
