export type SoundFont2SynthNodeMessageData =
  | {
      type: 'wasm-module-loaded'
    }
  | {
      type: 'init-completed-synth'
    }
  | {
      type: 'connected-to-port'
    }

export type SoundFont2SynthProcessorMessageData =
  | {
      type: 'send-wasm-module'
      wasmBytes: ArrayBuffer
      sf2Bytes: ArrayBuffer
    }
  | {
      type: 'init-synth'
      sampleRate: number
    }
  | {
      type: 'connect-to-port'
    }
  | {
      type: 'note-on'
      channel: number
      key: number
      vel: number
      delayTime?: number
    }
  | {
      type: 'note-off'
      channel: number
      key: number
      delayTime?: number
    }
