export function cubicBezier(p0: number, p1: number, p2: number, p3: number) {
    return (t: number) => {
        const t1 = 1 - t;
        return t1 * t1 * t1 * p0 + 3 * t1 * t1 * t * p1 + 3 * t1 * t * t * p2 + t * t * t * p3;
    };
}
