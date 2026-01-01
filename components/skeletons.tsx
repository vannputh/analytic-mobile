import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function WatchingCardSkeleton() {
    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            {/* Poster Skeleton */}
            <Skeleton className="w-full aspect-[4/3]" />

            {/* Content Skeleton */}
            <div className="p-4 space-y-4">
                {/* Progress Section */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-8" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-24" />
                    <div className="flex-1" />
                    <Skeleton className="h-10 w-28" />
                </div>
            </div>
        </div>
    );
}

export function MediaCardSkeleton() {
    return (
        <Card className="overflow-hidden">
            <Skeleton className="aspect-[2/3] w-full" />
            <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/4" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <div className="space-y-1">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </CardContent>
        </Card>
    );
}

export function MediaTableSkeleton() {
    return (
        <div className="rounded-md border overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead><Skeleton className="h-4 w-8" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-8" /></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-12 w-8" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export function AnalyticsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardContent className="p-6 space-y-2">
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-3 w-3/4" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardContent className="p-6">
                        <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
