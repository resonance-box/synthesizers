export type SynthesizerNodeMessageDataForSetup =
  | {
      type: 'loadedWasmModule'
    }
  | {
      type: 'initializedSynthesizer'
    }
  | {
      type: 'connectedToPort'
    }

export type SynthesizerProcessorMessageDataForSetup =
  | {
      type: 'sendWasmModule'
      wasmBytes: ArrayBuffer
      sf2Bytes: ArrayBuffer
    }
  | {
      type: 'initializeSynthesizer'
      sampleRate: number
    }
  | {
      type: 'connectToPort'
    }

export type SynthesizerProcessorMessageData =
  | {
      type: 'noteOn'
      key: number
      vel: number
      delayTime?: number
    }
  | {
      type: 'noteOff'
      key: number
      delayTime?: number
    }
