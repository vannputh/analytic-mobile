"use client";

import { Star, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingInputProps {
    value: number | null | undefined;
    onChange: (value: number) => void;
    maxStars?: number;
    size?: "sm" | "md" | "lg";
    showNumericInput?: boolean;
    className?: string;
}

export function StarRatingInput({
    value,
    onChange,
    maxStars = 10,
    size = "md",
    showNumericInput = true,
    className,
}: StarRatingInputProps) {
    const currentValue = value || 0;

    const sizeClasses = {
        sm: "h-4 w-4",
        md: "h-5 w-5",
        lg: "h-6 w-6",
    };

    const buttonClasses = {
        sm: "h-4 w-5",
        md: "h-5 w-6",
        lg: "h-6 w-7",
    };

    return (
        <div className={cn("flex items-center gap-3", className)}>
            {showNumericInput && (
                <div className="flex items-center border rounded-md h-10 pl-3 pr-1 min-w-[5rem] justify-between bg-background">
                    <span className="font-medium">{currentValue || "--"}</span>
                    <div className="flex flex-col border-l ml-2">
                        <button
                            type="button"
                            className={cn(
                                "flex items-center justify-center hover:bg-muted rounded-tr-sm transition-colors",
                                buttonClasses[size]
                            )}
                            onClick={() => onChange(Math.min(maxStars, currentValue + 1))}
                        >
                            <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                            type="button"
                            className={cn(
                                "flex items-center justify-center hover:bg-muted rounded-br-sm transition-colors",
                                buttonClasses[size]
                            )}
                            onClick={() => onChange(Math.max(0, currentValue - 1))}
                        >
                            <ChevronDown className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            )}
            <div className="flex text-yellow-500 gap-0.5">
                {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
                    <Star
                        key={star}
                        className={cn(
                            sizeClasses[size],
                            "cursor-pointer hover:scale-110 transition-transform",
                            currentValue >= star ? "fill-current" : "text-muted-foreground/30"
                        )}
                        onClick={() => onChange(star)}
                    />
                ))}
            </div>
            <span className="text-base font-medium">
                {currentValue ? `${currentValue}.0` : "0.0"}/{maxStars}
            </span>
        </div>
    );
}
