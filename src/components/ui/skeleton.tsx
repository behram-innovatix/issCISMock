import { cn } from "@/lib/cn"

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn("skeleton rounded-2xl", className)} />
}

export function ScreenSkeleton() {
    return (
        <div className="space-y-4" aria-busy="true" aria-label="Loading">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} className="h-[108px]" />
                ))}
            </div>
            <div className="grid grid-cols-12 gap-4">
                <Skeleton className="col-span-12 h-80 xl:col-span-8" />
                <Skeleton className="col-span-12 h-80 xl:col-span-4" />
                <Skeleton className="col-span-12 h-72 xl:col-span-6" />
                <Skeleton className="col-span-12 h-72 xl:col-span-6" />
            </div>
        </div>
    )
}
