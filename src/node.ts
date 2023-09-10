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

    const postData: SynthesizerProcessorMessageDataForSetup = {
      kind: 'sendWasmModule',
      wasmBytes,
      sf2Bytes,
    }

    await new Promise<void>((resolve) => {
      this.finishedSetupCallback = resolve
      this.port.postMessage(postData)
    })
  }

  onprocessorerror = (): void => {
    console.error('An error from SoundFont2SynthProcessor.process() occurred')
  }

  onmessage(event: MessageEvent<SynthesizerNodeMessageDataForSetup>): void {
    const data = event.data
    let postData: SynthesizerProcessorMessageDataForSetup

    switch (data.kind) {
      case 'loadedWasmModule': {
        postData = {
          kind: 'initializeSynthesizer',
          sampleRate: this.context.sampleRate,
        }
        this.port.postMessage(postData)
        break
      }
      case 'initializedSynthesizer': {
        postData = {
          kind: 'connectToPort',
        }
        this.port.postMessage(postData, [this._port])
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
