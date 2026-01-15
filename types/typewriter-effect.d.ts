declare module 'typewriter-effect' {
    export interface Options {
        strings?: string[];
        cursor?: string;
        delay?: number | 'natural';
        loop?: boolean;
        autoStart?: boolean;
        pauseFor?: number;
        devMode?: boolean;
        skipAddStyles?: boolean;
        wrapperClassName?: string;
        cursorClassName?: string;
        stringSplitter?: (string: string) => string[];
        deleteSpeed?: number | 'natural';
        onCreateTextNode?: (character: string, textNode: Text) => Text | HTMLElement | null;
        onRemoveNode?: (node: HTMLElement | Text) => void;
    }

    export interface TypewriterClass {
        typeString(string: string): TypewriterClass;
        deleteAll(speed?: number | 'natural'): TypewriterClass;
        pauseFor(ms: number): TypewriterClass;
        start(): TypewriterClass;
        stop(): TypewriterClass;
        callFunction(cb: () => void): TypewriterClass;
    }

    export default class Typewriter extends React.Component<{
        onInit?: (typewriter: TypewriterClass) => void;
        options?: Options;
    }> {}
}
