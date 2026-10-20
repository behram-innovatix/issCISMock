import type { InsightsMeta } from "@/lib/insights"
import { type MockState, seedState } from "./seed"

// The demo connections live in this browser's localStorage, so a preview visitor's changes survive
// a reload but never reach anyone else. Storage can be unavailable (private windows, blocked site
// data); then the state is kept in memory for the page's lifetime.

const KEY = "cis.mock.connections.v1"

let memory: MockState | null = null

/** The current state, with the outcome of runs that have finished since the last read applied. */
export function load(): MockState {
    if (!memory) {
        try {
            const raw = window.localStorage.getItem(KEY)
            const parsed = raw ? (JSON.parse(raw) as MockState) : null
            if (parsed?.version === 1) memory = parsed
        } catch {
            // fall through to a fresh seed
        }
    }
    memory ??= seedState()
    settle(memory)
    return memory
}

export function save(state: MockState) {
    memory = state
    try {
        window.localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
        // memory only
    }
}

/** Back to the seeded demo connections. */
export function resetMockConnections() {
    memory = null
    try {
        window.localStorage.removeItem(KEY)
    } catch {
        // nothing stored
    }
}

/** A platform's sources as the insights meta lists them. */
export function mockSourcesFor(platform: string): InsightsMeta["sources"] {
    return load()
        .sources.filter((s) => s.platform === platform)
        .map(({ name, status, is_active, last_synced_at }) => ({ name, status, is_active, last_synced_at }))
}

/** Writes the outcome of runs that have finished since the last request to their sources. */
export function settle(state: MockState) {
    const now = Date.now()
    let changed = false
    for (const run of state.runs) {
        if (run.applied || !run.finished_at || Date.parse(run.finished_at) > now) continue
        run.applied = true
        changed = true
        const s = state.sources.find((x) => x.id === run.source_id)
        if (!s) continue
        s.status = "healthy"
        s.last_error = null
        s.last_synced_at = run.finished_at
        for (const t of state.selections) if (t.source_id === s.id) t.last_synced_at = run.finished_at
    }
    if (changed) save(state)
}
