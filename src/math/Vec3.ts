export type Vec3 = [number, number, number];

export const Vec3 = {
    add: (a: Vec3, b: Vec3): Vec3 => [a[0]+b[0], a[1]+b[1], a[2]+b[2]],
    sub: (a: Vec3, b: Vec3): Vec3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]],
    mul: (a: Vec3, s: number): Vec3 => [a[0]*s, a[1]*s, a[2]*s],
    dot: (a: Vec3, b: Vec3): number => a[0]*b[0] + a[1]*b[1] + a[2]*b[2],
    distance: (a: Vec3, b: Vec3): number => {
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        const dz = a[2] - b[2];
        return Math.hypot(dx, dy, dz);
    },
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