// Seeded PRNG + helpers. The EDU generator must call these in exactly the same order as the
// HTML mockup so the numbers match it 1:1.
export type Rng = () => number

export function mulberry32(seed: number): Rng {
    let a = seed
    return () => {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

export function makeRandom(seed: number) {
    const R = mulberry32(seed)
    const pick = <T>(a: readonly T[]): T => a[Math.floor(R() * a.length)]
    const between = (a: number, b: number) => a + R() * (b - a)
    const weighted = <T>(items: readonly (readonly [T, number])[]): T => {
        let t = 0
        for (const i of items) t += i[1]
        let r = R() * t
        for (const i of items) if ((r -= i[1]) <= 0) return i[0]
        return items[items.length - 1][0]
    }
    return { R, pick, between, weighted }
}
