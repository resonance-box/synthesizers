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
      key: number
      vel: number
      delayTime?: number
    }
  | {
      kind: 'noteOff'
      key: number
      delayTime?: number
    }
