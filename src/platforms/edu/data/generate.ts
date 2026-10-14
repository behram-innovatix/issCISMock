import { NW } from "@/lib/calendar"
import { makeRandom } from "@/lib/seed"
import {
    BTYPES,
    CODE_BY_CAT,
    FIRST_F,
    FIRST_M,
    HOUSES,
    LAST,
    LEGACY_STAFF,
    LOCS,
    type MarkCat,
    NATS,
    SCHOOLS,
    SPW,
    YG_ORDER,
    YGS,
} from "./constants"
import type { Gender, Section, Student } from "./types"

export const EDU_SEED = 20261013

/**
 * Port of the mockup's generator. The RNG call order is kept exactly as in the HTML
 * so every count and percentage matches it. Teacher links (formTutorId, byStaffId) are
 * filled in later by the HR generator, which owns the staff list.
 */
export function generateEdu(): { sections: Section[]; students: Student[] } {
    const { R, pick, between, weighted } = makeRandom(EDU_SEED)
    const POS_T = BTYPES.map((t, i) => [i, t.w] as [number, number]).filter(([i]) => BTYPES[i].s > 0)
    const NEG_T = BTYPES.map((t, i) => [i, t.w] as [number, number]).filter(([i]) => BTYPES[i].s < 0)

    const sections: Section[] = []
    const students: Student[] = []
    let sid = 0

    for (const sc of SCHOOLS) {
        for (const [yg, stage] of YGS) {
            const nSec = Math.round(between(sc.secs[0], sc.secs[1] + 0.49))
            for (let s = 0; s < nSec; s++) {
                const sec = "ABCDEF"[s]
                const cap = yg === "NR" || yg === "RE" ? 22 : 26
                const fill = weighted([
                    [between(0.93, 1), 55],
                    [between(0.78, 0.92), 33],
                    [between(0.58, 0.76), 12],
                ])
                const n = Math.min(cap, Math.round(cap * fill))
                const key = `${sc.id}-${yg}-${sec}`
                sections.push({ key, school: sc.id, yg, stage, sec, cap, formTutorId: 0, subjectTeacherIds: [] })
                const older = YG_ORDER[yg] >= 11 ? 1.35 : YG_ORDER[yg] <= 1 ? 1.15 : 1
                for (let k = 0; k < n; k++) {
                    const g: Gender = sc.intake === "Girls" ? "F" : sc.intake === "Boys" ? "M" : R() < 0.51 ? "M" : "F"
                    const first = pick(g === "M" ? FIRST_M : FIRST_F)
                    const last = pick(LAST)
                    const absBase =
                        weighted([
                            [between(0.008, 0.035), 78],
                            [between(0.04, 0.085), 16],
                            [between(0.1, 0.2), 6],
                        ]) * older
                    const lateBase = between(0.008, 0.05)
                    const marks = new Uint8Array(NW * SPW)
                    for (let w = 0; w < NW; w++)
                        for (let d = 0; d < 5; d++) {
                            // whole-day absence is common; split AM/PM days happen too
                            const dayF = d === 4 ? 1.35 : d === 0 ? 1.15 : 1
                            const wkF = w === 0 ? 1.3 : 1
                            const pa = absBase * dayF * wkF
                            if (R() < pa * 0.7) {
                                const cat: MarkCat = R() < 0.68 ? "auth" : "unauth"
                                const c = weighted(CODE_BY_CAT[cat])
                                marks[w * SPW + d * 2] = c
                                marks[w * SPW + d * 2 + 1] = c
                                continue
                            }
                            for (let ss = 0; ss < 2; ss++) {
                                const r = R()
                                const pl = lateBase * (ss === 0 ? 1.8 : 0.45)
                                const ph = pa * 0.3
                                const cat: MarkCat = r < ph ? (R() < 0.6 ? "auth" : "unauth") : r < ph + pl ? "late" : "present"
                                marks[w * SPW + d * 2 + ss] = weighted(CODE_BY_CAT[cat])
                            }
                        }
                    const engage = Math.max(0.2, 1.25 - absBase * 6)
                    const ev: Student["ev"] = []
                    const nAch = Math.round(between(1, 13) * engage)
                    for (let e = 0; e < nAch; e++) {
                        const ti = weighted(POS_T)
                        const t = BTYPES[ti]
                        ev.push({
                            w: Math.floor(R() * NW),
                            d: Math.floor(R() * 5),
                            t: ti,
                            pts: Math.round(between(t.min, t.max)),
                            byStaffId: LEGACY_STAFF.indexOf(pick(LEGACY_STAFF)),
                        })
                    }
                    const nInc = R() < 0.58 * engage ? 0 : Math.round(between(1, 4 + absBase * 40))
                    for (let e = 0; e < nInc; e++) {
                        const ti = weighted(NEG_T)
                        const t = BTYPES[ti]
                        ev.push({
                            w: Math.floor(R() * NW),
                            d: Math.floor(R() * 5),
                            t: ti,
                            pts: -Math.round(between(t.min, t.max)),
                            loc: weighted(LOCS),
                            byStaffId: LEGACY_STAFF.indexOf(pick(LEGACY_STAFF)),
                        })
                    }
                    students.push({
                        id: ++sid,
                        name: `${first} ${last}`,
                        gender: g,
                        school: sc.id,
                        yg,
                        stage,
                        sec,
                        key,
                        house: pick(HOUSES),
                        nat: weighted(NATS),
                        s: marks,
                        ev,
                    })
                }
            }
        }
    }
    return { sections, students }
}
