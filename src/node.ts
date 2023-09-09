import { PROCESSOR_NAME } from './constants'
// eslint-disable-next-line
// @ts-ignore
import processorRaw from './generated/processor.js?raw'
// eslint-disable-next-line
// @ts-ignore
import wasmURL from './generated/wasm/synthesizers_bg.wasm?url'
import {
  type SoundFont2SynthNodeMessageData,
  type SoundFont2SynthProcessorMessageData,
} from './types'

const processorBlob = new Blob([processorRaw], {
  type: 'application/javascript; charset=utf-8',
})

export class SoundFont2SynthNodeImpl extends AudioWorkletNode {
  private readonly connectedPort: MessagePort
  private initCompletedSynthCallback?: () => void
  sampleRate: number

  constructor(
    port: MessagePort,
    context: BaseAudioContext,
    name: string,
    options?: AudioWorkletNodeOptions,
  ) {
    super(context, name, options)
    this.connectedPort = port
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

    const data: SoundFont2SynthProcessorMessageData = {
      type: 'send-wasm-module',
      wasmBytes,
      sf2Bytes,
    }

    await new Promise<void>((resolve) => {
      this.initCompletedSynthCallback = resolve
      this.port.postMessage(data)
    })
  }

  onprocessorerror = (): void => {
    console.error('An error from SoundFont2SynthProcessor.process() occurred')
  }

  onmessage(event: MessageEvent<SoundFont2SynthNodeMessageData>): void {
    const data = event.data

    switch (data.type) {
      case 'wasm-module-loaded': {
        const data: SoundFont2SynthProcessorMessageData = {
          type: 'init-synth',
          sampleRate: this.context.sampleRate,
        }
        this.port.postMessage(data)
        break
      }
      case 'init-completed-synth': {
        const data: SoundFont2SynthProcessorMessageData = {
          type: 'connect-to-port',
        }
        this.port.postMessage(data, [this.connectedPort])
        break
      }
      case 'connected-to-port':
        this.initCompletedSynthCallback?.()
        break
      default:
        break
    }
  }
}

export async function createSoundFont2SynthNode(
  port: MessagePort,
  context: AudioContext,
  sf2URL: string | URL,
): Promise<AudioWorkletNode> {
  let node

  try {
    // Fetch the WebAssembly module that performs pitch detection.
    const response = await window.fetch(wasmURL)
    const wasmBytes = await response.arrayBuffer()

    // Add our audio processor worklet to the context.
    try {
      const processorUrl = URL.createObjectURL(processorBlob)
      await context.audioWorklet.addModule(processorUrl)
    } catch (err) {
      let errorMessage = 'Failed to load sf2 synth worklet. '

      if (err instanceof Error) {
        errorMessage += `Further info: ${err.message}`
      } else {
        errorMessage += 'Unexpected error'
      }

      throw new Error(errorMessage)
    }

    // Create the AudioWorkletNode which enables the main JavaScript thread to
    // communicate with the audio processor (which runs in a Worklet).
    node = new SoundFont2SynthNodeImpl(port, context, PROCESSOR_NAME)

    const sf2Response = await fetch(sf2URL)
    const sf2Bytes = await sf2Response.arrayBuffer()

    // Send the Wasm module to the audio node which in turn passes it to the
    // processor running in the Worklet thread. Also, pass any configuration
    // parameters for the Wasm detection algorithm.
    await node.init(wasmBytes, sf2Bytes)
  } catch (err) {
    let errorMessage = 'Failed to load audio analyzer WASM module. '

    if (err instanceof Error) {
      errorMessage += `Further info: ${err.message}`
    } else {
      errorMessage += 'Unexpected error'
    }

    throw new Error(errorMessage)
  }

  return node
}
