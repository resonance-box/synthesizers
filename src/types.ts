export type SynthesizerNodeMessageDataForSetup =
  | {
      kind: 'loadedWasmModule'
    }
  | {
      kind: 'initializedSynthesizer'
    }
  | {
      kind: 'connectedToPort'
    }

export type SynthesizerProcessorMessageDataForSetup =
  | {
      kind: 'sendWasmModule'
      wasmBytes: ArrayBuffer
      sf2Bytes: ArrayBuffer
    }
  | {
      kind: 'initializeSynthesizer'
      sampleRate: number
    }
  | {
      kind: 'connectToPort'
    }

export type SynthesizerEventMessageData =
  | {
      kind: 'noteOn'
      noteNumber: number
      velocity: number
      delayTime?: number
    }
  | {
      kind: 'noteOff'
      noteNumber: number
      delayTime?: number
    }
