"use client";

import { useState, useEffect, Component, ReactNode } from "react";
import Image, { ImageProps } from "next/image";

interface SafeImageProps extends ImageProps {
    fallbackElement?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

class ImageErrorBoundary extends Component<
    { children: ReactNode; onError: () => void; fallback: ReactNode },
    ErrorBoundaryState
> {
    constructor(props: { children: ReactNode; onError: () => void; fallback: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.warn("SafeImage error boundary caught:", error);
        this.props.onError();
    }

    componentDidUpdate(prevProps: { children: ReactNode }) {
        // Reset error state when src changes
        if (prevProps.children !== this.props.children && this.state.hasError) {
            this.setState({ hasError: false });
        }
    }

    render() {
        if (this.state.hasError) {
            return <>{this.props.fallback}</>;
        }
        return this.props.children;
    }
}

export function SafeImage({
    fallbackElement,
    src,
    alt,
    ...props
}: SafeImageProps) {
    const [error, setError] = useState(false);

    useEffect(() => {
        setError(false);
    }, [src]);

    // Handle invalid sources
    if (!src || src === "N/A" || error) {
        return <>{fallbackElement}</>;
    }

    return (
        <ImageErrorBoundary
            onError={() => setError(true)}
            fallback={fallbackElement}
        >
            <Image
                src={src}
                alt={alt}
                onError={() => setError(true)}
                {...props}
            />
        </ImageErrorBoundary>
    );
}
