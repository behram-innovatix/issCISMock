import { NW, weekRange, WEEKS } from "@/lib/calendar"
import { ratio, sum } from "@/lib/format"
import { statusOf, type Tone } from "@/lib/status"
import { BTYPES, CAT, CODES, schoolOf, secName, SPW, YGS, ygShort } from "./data/constants"
import type { EduDataset, Section, Student } from "./data/types"

export interface StudentMetrics {
    p: number
    l: number
    a: number
    u: number
    tot: number
    att: number
    amL: number
    amA: number
    pmL: number
    pmA: number
    ach: number
    inc: number
    achN: number
    incN: number
    net: number
    status: Tone
    ratio: number
}

/**
 * Attendance = (present + late) / sessions that count: sessions marked "attendance not required" or
 * not marked at all are left out. At risk if att < 90 or net ≤ −10; a student without any counted
 * session is judged on behaviour alone.
 */
export function metricsFor(st: Student, w0 = 0): StudentMetrics {
    let p = 0,
        l = 0,
        a = 0,
        u = 0,
        amL = 0,
        amA = 0,
        pmL = 0,
        pmA = 0
    for (let w = w0; w < NW; w++)
        for (let k = 0; k < SPW; k++) {
            const c = CAT[st.s[w * SPW + k]] ?? "none"
            const am = k % 2 === 0
            if (c === "none") continue
            if (c === "present") p++
            else if (c === "late") {
                l++
                if (am) amL++
                else pmL++
            } else {
                if (c === "auth") a++
                else u++
                if (am) amA++
                else pmA++
            }
        }
    let ach = 0,
        inc = 0,
        achN = 0,
        incN = 0
    for (const e of st.ev) {
        if (e.w < w0) continue
        if (e.pts > 0) {
            ach += e.pts
            achN++
        } else {
            inc -= e.pts
            incN++
        }
    }
    const tot = p + l + a + u
    const att = tot ? ((p + l) / tot) * 100 : 100
    const net = ach - inc
    const status: Tone = (tot && att < 90) || net <= -10 ? "bad" : (tot && att < 95) || net < 0 ? "warn" : "good"
    return {
        p,
        l,
        a,
        u,
        tot,
        att,
        amL,
        amA,
        pmL,
        pmA,
        ach,
        inc,
        achN,
        incN,
        net,
        status,
        ratio: ach + inc ? (ach / (ach + inc)) * 100 : 100,
    }
}

export interface EduFilters {
    school: string
    stage: string
    yg: string
    sec: string
    gender: string
    w0: number
}
export const DEFAULT_EDU_FILTERS: EduFilters = { school: "all", stage: "all", yg: "all", sec: "all", gender: "all", w0: 0 }

const inScope = (x: { school: string; stage: string; yg: string; sec: string }, f: EduFilters) =>
    (f.school === "all" || x.school === f.school) &&
    (f.stage === "all" || x.stage === f.stage) &&
    (f.yg === "all" || x.yg === f.yg) &&
    (f.sec === "all" || x.sec === f.sec)

export type ScoredStudent = Student & { m: StudentMetrics }

/** One pass over the filtered students, producing every roll-up the EDU screens need. */
export function analyseEdu(data: EduDataset, f: EduFilters) {
    const list: ScoredStudent[] = data.students
        .filter((st) => inScope(st, f) && (f.gender === "all" || st.gender === f.gender))
        .map((st) => ({ ...st, m: metricsFor(st, f.w0) }))
    const n = list.length
    const secsIn = data.sections.filter((x) => inScope(x, f))
    // capacity only counts sections whose source records it
    const cap = sum(secsIn.map((x) => x.cap ?? 0))

    let P = 0,
        L = 0,
        A = 0,
        U = 0,
        amL = 0,
        amA = 0,
        pmL = 0,
        pmA = 0
    let ACH = 0,
        INC = 0,
        withInc = 0,
        persist = 0,
        achN = 0,
        incN = 0,
        atRisk = 0
    for (const { m } of list) {
        P += m.p
        L += m.l
        A += m.a
        U += m.u
        amL += m.amL
        amA += m.amA
        pmL += m.pmL
        pmA += m.pmA
        ACH += m.ach
        INC += m.inc
        achN += m.achN
        incN += m.incN
        if (m.incN) withInc++
        if (m.tot && m.att < 90) persist++
        if (m.status === "bad") atRisk++
    }
    const TOT = P + L + A + U
    const att = TOT ? ((P + L) / TOT) * 100 : 0
    const male = list.filter((s) => s.gender === "M").length
    const female = n - male

    // year groups
    const ygPresent = [...YGS.map((y) => y[0]), ...new Set(list.map((s) => s.yg).filter((y) => !YGS.some(([c]) => c === y)))].filter((y) =>
        list.some((s) => s.yg === y),
    )
    const byYG: Record<string, { M: number; F: number; list: ScoredStudent[] }> = Object.fromEntries(
        ygPresent.map((y) => [y, { M: 0, F: 0, list: [] as ScoredStudent[] }]),
    )
    for (const st of list) {
        byYG[st.yg][st.gender]++
        byYG[st.yg].list.push(st)
    }
    const enrolledByKey: Record<string, number> = {}
    for (const st of list) enrolledByKey[st.key] = (enrolledByKey[st.key] || 0) + 1
    const fullSecs = secsIn.filter((x) => x.cap !== null && (enrolledByKey[x.key] || 0) >= x.cap).length

    // weekly + heatmap
    const wk = Array.from({ length: NW }, () => [0, 0, 0, 0]) // present, late, absent, total
    const hm = Array.from({ length: NW }, () => Array.from({ length: 5 }, () => [0, 0]))
    const codeCount = new Array(CODES.length).fill(0)
    for (const st of list)
        for (let w = f.w0; w < NW; w++)
            for (let k = 0; k < SPW; k++) {
                const code = st.s[w * SPW + k]
                const c = CAT[code] ?? "none"
                codeCount[code]++
                if (c === "none") continue
                const ok = c === "present" || c === "late" ? 1 : 0
                wk[w][c === "present" ? 0 : c === "late" ? 1 : 2]++
                wk[w][3]++
                hm[w][k >> 1][0] += ok
                hm[w][k >> 1][1]++
            }
    // A week (or day) where under 5% of the possible sessions count is a closure (holiday, a
    // few stray marks): null, so charts leave a gap instead of a misleading figure.
    const minWeek = Math.max(1, 0.05 * n * SPW)
    const minDay = Math.max(1, 0.05 * n * 2)
    const weeks = weekRange(f.w0).map((w) => ({
        w,
        label: WEEKS[w],
        att: wk[w][3] >= minWeek ? ((wk[w][0] + wk[w][1]) / wk[w][3]) * 100 : null,
        late: ratio(wk[w][1], wk[w][3]),
        abs: ratio(wk[w][2], wk[w][3]),
    }))
    const heat = weekRange(f.w0).map((w) => hm[w].map(([ok, t]) => (t >= minDay ? (ok / t) * 100 : null)))

    // behaviour
    const bw = Array.from({ length: NW }, () => [0, 0])
    const tp = new Array(BTYPES.length).fill(0)
    const loc: Record<string, number> = {}
    for (const st of list)
        for (const e of st.ev) {
            if (e.w < f.w0) continue
            if (e.pts > 0) bw[e.w][0] += e.pts
            else {
                bw[e.w][1] += e.pts
                if (e.loc) loc[e.loc] = (loc[e.loc] || 0) + 1
            }
            tp[e.t] += e.pts
        }

    const bands = [0, 0, 0, 0]
    for (const st of list) if (st.m.tot) bands[st.m.att >= 97 ? 0 : st.m.att >= 95 ? 1 : st.m.att >= 90 ? 2 : 3]++

    const nat: Record<string, number> = {}
    for (const st of list) {
        const key = st.nat || "Not recorded"
        nat[key] = (nat[key] || 0) + 1
    }

    const half = TOT / 2 || 1
    return {
        list,
        n,
        male,
        female,
        secsIn,
        cap,
        util: cap ? (n / cap) * 100 : 0,
        fullSecs,
        enrolledByKey,
        totals: { P, L, A, U, TOT, ACH, INC, achN, incN, withInc, persist, atRisk },
        att,
        attTone: statusOf(att),
        late: ratio(L, TOT),
        persistTone: (persist / (n || 1) < 0.05 ? "good" : persist / (n || 1) < 0.1 ? "warn" : "bad") as Tone,
        weeks,
        heat,
        yearGroups: ygPresent.map((y) => {
            const ok = sum(byYG[y].list.map((s) => s.m.p + s.m.l))
            const t = sum(byYG[y].list.map((s) => s.m.tot))
            return {
                yg: y,
                label: ygShort(y),
                M: byYG[y].M,
                F: byYG[y].F,
                att: t ? (ok / t) * 100 : 0,
                ach: sum(byYG[y].list.map((s) => s.m.ach)),
                inc: -sum(byYG[y].list.map((s) => s.m.inc)),
            }
        }),
        bands,
        ampm: [
            { name: "AM", late: (amL / half) * 100, abs: (amA / half) * 100 },
            { name: "PM", late: (pmL / half) * 100, abs: (pmA / half) * 100 },
        ],
        codeCount,
        behaviourWeeks: weekRange(f.w0).map((w) => ({ label: WEEKS[w], ach: bw[w][0], inc: bw[w][1] })),
        types: BTYPES.map((t, i) => ({ name: t.n, v: tp[i] }))
            .filter((x) => x.v !== 0)
            .sort((a, b) => b.v - a.v),
        locations: Object.entries(loc)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, v]) => ({ name, v })),
        nationalities: Object.entries(nat)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 7)
            .map(([name, v]) => ({ name, v })),
    }
}
export type EduAnalysis = ReturnType<typeof analyseEdu>

// Attendance × behaviour matrix bands. Box colour follows the student status rule.
export const ATT_BANDS = [
    ["95% or more", "On target"],
    ["90–95%", "Watch"],
    ["Below 90%", "Persistent absence"],
] as const
export const BEH_BANDS = [
    ["Net points 0 or more", "Positive"],
    ["Net −1 to −9", "Slightly negative"],
    ["Net −10 or lower", "Concerning"],
] as const
export const attBand = (m: StudentMetrics) => (m.att >= 95 ? 0 : m.att >= 90 ? 1 : 2)
export const behBand = (m: StudentMetrics) => (m.net >= 0 ? 0 : m.net > -10 ? 1 : 2)

export function sectionAverageWeeks(data: EduDataset, key: string, w0: number) {
    const peers = data.students.filter((s) => s.key === key)
    return weekRange(w0).map((w) => {
        let ok = 0,
            t = 0
        for (const st of peers)
            for (let k = 0; k < SPW; k++) {
                const c = CAT[st.s[w * SPW + k]] ?? "none"
                if (c === "none") continue
                if (c === "present" || c === "late") ok++
                t++
            }
        return t ? (ok / t) * 100 : null
    })
}

/** Weekly attendance for one student; null for a week without counted sessions (holidays). */
export function studentWeeks(st: Student, w0: number) {
    return weekRange(w0).map((w) => {
        let ok = 0,
            t = 0
        for (let k = 0; k < SPW; k++) {
            const c = CAT[st.s[w * SPW + k]] ?? "none"
            if (c === "none") continue
            if (c === "present" || c === "late") ok++
            t++
        }
        return t ? (ok / t) * 100 : null
    })
}

/** Class outcome summary for a set of sections; used by HR Teacher Impact. */
export function sectionOutcomes(data: EduDataset, keys: string[], w0 = 0) {
    const set = new Set(keys)
    const studs = data.students.filter((s) => set.has(s.key))
    const ms = studs.map((s) => metricsFor(s, w0))
    const ok = sum(ms.map((m) => m.p + m.l))
    const tot = sum(ms.map((m) => m.tot))
    return {
        students: studs.length,
        att: tot ? (ok / tot) * 100 : 0,
        netPerStudent: studs.length ? sum(ms.map((m) => m.net)) / studs.length : 0,
        atRisk: ms.filter((m) => m.status === "bad").length,
    }
}

export const sectionLabel = (x: Pick<Section, "school" | "yg" | "sec">, withSchool = false) => {
    const name = secName(x.yg, x.sec)
    return withSchool ? `${schoolOf(x.school).short} ${name}` : name
}
