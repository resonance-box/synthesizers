import {
  type SynthesizerNodeMessageDataForSetup,
  type SynthesizerProcessorMessageDataForSetup,
} from './types'

export class SoundFont2SynthesizerNodeImpl extends AudioWorkletNode {
  private readonly _port: MessagePort
  private finishedSetupCallback?: () => void
  sampleRate: number

  constructor(
    port: MessagePort,
    context: BaseAudioContext,
    name: string,
    options?: AudioWorkletNodeOptions,
  ) {
    super(context, name, options)
    this._port = port
    this.sampleRate = 44100
  }

  /**
   * @param {ArrayBuffer} wasmBytes
   * @param {ArrayBuffer} sf2Bytes
   */
  async init(wasmBytes: ArrayBuffer, sf2Bytes: ArrayBuffer): Promise<void> {
    this.port.onmessage = (event) => {
      this.onmessage(event)
    }

    const data: SynthesizerProcessorMessageDataForSetup = {
      kind: 'sendWasmModule',
      wasmBytes,
      sf2Bytes,
    }

    await new Promise<void>((resolve) => {
      this.finishedSetupCallback = resolve
      this.port.postMessage(data)
    })
  }

  onprocessorerror = (): void => {
    console.error('An error from SoundFont2SynthProcessor.process() occurred')
  }

  onmessage(event: MessageEvent<SynthesizerNodeMessageDataForSetup>): void {
    const data = event.data

    switch (data.kind) {
      case 'loadedWasmModule': {
        const data: SynthesizerProcessorMessageDataForSetup = {
          kind: 'initializeSynthesizer',
          sampleRate: this.context.sampleRate,
        }
        this.port.postMessage(data)
        break
      }
      case 'initializedSynthesizer': {
        const data: SynthesizerProcessorMessageDataForSetup = {
          kind: 'connectToPort',
        }
        this.port.postMessage(data, [this._port])
        break
      }
      case 'connectedToPort':
        this.finishedSetupCallback?.()
        break
      default:
        break
    }
  }
}
