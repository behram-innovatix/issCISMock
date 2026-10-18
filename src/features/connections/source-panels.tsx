"use client"

import { Button } from "@/components/ui/button"
import { Empty, Note, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { Check, Copy, FileSpreadsheet, Trash2, Upload } from "lucide-react"
import { useRef, useState } from "react"
import { useDeleteFile, useFiles, useUploadFile, type DataSource } from "./api"
import { dateTime } from "./shared"

const size = (bytes: number) =>
    bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(1)} MB`

/** Spreadsheet sources: one uploaded CSV / Excel file per stream. */
export function FilesPanel({ source, streams }: { source: DataSource; streams: string[] }) {
    const { data: files, error } = useFiles(source.id, true)
    const upload = useUploadFile(source.id)
    const remove = useDeleteFile(source.id)
    const input = useRef<HTMLInputElement>(null)
    const [target, setTarget] = useState<string | null>(null)
    const byStream = new Map((files ?? []).map((f) => [f.stream, f]))
    const problem = upload.error ?? remove.error ?? error

    const pick = (stream: string) => {
        setTarget(stream)
        input.current?.click()
    }

    return (
        <Panel
            title="Files"
            subtitle="One spreadsheet per stream: a header row with the stream’s field names, then one record per row. A new upload replaces the stream at the next sync."
            bodyClassName="-mx-5 -mb-5"
        >
            <input
                ref={input}
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && target) upload.mutate({ stream: target, file })
                    e.target.value = ""
                }}
            />
            {problem && (
                <p className="bg-bad-soft text-bad-ink mx-5 mb-3 rounded-xl px-3 py-2 text-[12px] font-semibold">{problem.message}</p>
            )}
            <ul className="border-line border-t">
                {streams.map((stream) => {
                    const file = byStream.get(stream)
                    const uploading = upload.isPending && upload.variables?.stream === stream
                    const removing = remove.isPending && remove.variables === stream
                    return (
                        <li key={stream} className="border-line flex flex-wrap items-center gap-3 border-b px-5 py-3 last:border-b-0">
                            <span
                                className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${file ? "bg-good-soft text-good-ink" : "bg-bg-2 text-muted"}`}
                            >
                                <FileSpreadsheet className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="text-ink text-[13px] font-semibold">{stream.replaceAll("_", " ")}</div>
                                <div className="text-muted truncate text-[11.5px]">
                                    {file
                                        ? `${file.name} · ${size(file.size)} · uploaded ${dateTime(file.uploaded_at)}`
                                        : "No file uploaded"}
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant={file ? "ghost" : "soft"}
                                onClick={() => pick(stream)}
                                disabled={uploading || removing}
                            >
                                <Upload className="size-3.5" /> {uploading ? "Uploading…" : file ? "Replace" : "Upload"}
                            </Button>
                            {file && (
                                <Button
                                    size="sm"
                                    onClick={() => remove.mutate(stream)}
                                    disabled={uploading || removing}
                                    aria-label={`Remove the ${stream} file`}
                                >
                                    <Trash2 className="size-3.5" />
                                </Button>
                            )}
                        </li>
                    )
                })}
            </ul>
        </Panel>
    )
}

function CopyButton({ text, label }: { text: string; label: string }) {
    const [done, setDone] = useState(false)
    return (
        <Button
            size="sm"
            aria-label={label}
            onClick={() => {
                void navigator.clipboard.writeText(text)
                setDone(true)
                setTimeout(() => setDone(false), 1500)
            }}
        >
            {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {done ? "Copied" : "Copy"}
        </Button>
    )
}

/** Push-ingest sources: where the sending system posts, and how it signs requests. */
export function IngestPanel({ source, streams }: { source: DataSource; streams: string[] }) {
    const url = source.ingest_url ?? ""
    if (!url) return <Empty>This source has no push endpoint.</Empty>

    const example = url.replace("{stream}", streams.includes("students") ? "students" : (streams[0] ?? "stream"))
    const snippet = [
        `BODY='{"records":[{"id":"…"}],"deleted":[]}'`,
        "TS=$(date +%s)",
        `SIG=$(printf '%s.%s' "$TS" "$BODY" | openssl dgst -sha256 -hmac "$CIS_SIGNING_SECRET" | sed 's/^.* //')`,
        `curl -X POST "${example}" \\`,
        `  -H "Content-Type: application/json" -H "X-CIS-Timestamp: $TS" -H "X-CIS-Signature: $SIG" \\`,
        `  --data "$BODY"`,
    ].join("\n")

    return (
        <Panel
            title="Push endpoint"
            subtitle="The sending system posts canonical records here; each request is signed with the source’s signing secret."
        >
            <div className="space-y-4">
                <div>
                    <div className="text-ink-2 mb-1.5 text-[12px] font-semibold">Endpoint</div>
                    <div className="border-line bg-surface-2 flex items-center gap-2 rounded-xl border px-3 py-2">
                        <code className="text-ink min-w-0 flex-1 truncate font-mono text-[12.5px]">POST {url}</code>
                        <CopyButton text={url} label="Copy the endpoint URL" />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {streams.map((s) => (
                            <Pill key={s}>{s}</Pill>
                        ))}
                    </div>
                </div>
                <div>
                    <div className="text-ink-2 mb-1.5 text-[12px] font-semibold">Signing</div>
                    <Note>
                        Send <code className="font-mono">X-CIS-Timestamp</code> (unix seconds, within 5 minutes) and{" "}
                        <code className="font-mono">X-CIS-Signature</code>: the hex HMAC-SHA256 of{" "}
                        <code className="font-mono">{"{timestamp}.{raw body}"}</code> with the signing secret. The secret isn’t shown again
                        after saving; generate a new one in Settings if it has been lost.
                    </Note>
                </div>
                <div>
                    <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-ink-2 text-[12px] font-semibold">Example</span>
                        <CopyButton text={snippet} label="Copy the example" />
                    </div>
                    <pre className="border-line bg-surface-2 text-ink-2 overflow-x-auto rounded-xl border p-3 font-mono text-[11.5px] leading-relaxed">
                        {snippet}
                    </pre>
                </div>
                <Note>
                    {source.config.sync_on_push === false
                        ? "Records wait for the schedule before they reach the dashboards."
                        : "Each push queues a sync, so records reach the dashboards within moments (with a queue worker running)."}{" "}
                    Up to 5,000 records per request; ids listed in <code className="font-mono">deleted</code> are removed.
                </Note>
            </div>
        </Panel>
    )
}
