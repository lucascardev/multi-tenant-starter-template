"use client";

import Typewriter from 'typewriter-effect';

interface TypewriterTitleProps {
    strings: string[];
    loop?: boolean;
    autoStart?: boolean;
}

export function TypewriterTitle({ strings, loop = true, autoStart = true }: TypewriterTitleProps) {
    return (
        <span className="inline-block text-brand-orange font-bold">
            <Typewriter
                options={{
                    strings: strings,
                    autoStart: autoStart,
                    loop: loop,
                }}
            />
        </span>
    );
}
