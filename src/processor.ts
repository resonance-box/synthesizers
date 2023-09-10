import './text-encoder-decoder.js'

import { PROCESSOR_NAME } from './constants.js'
import init, { SoundFont2Synthesizer } from './generated/wasm/synthesizers'
import {
  type SynthesizerEventMessageData,
  type SynthesizerNodeMessageDataForSetup,
  type SynthesizerProcessorMessageDataForSetup,
} from './types'

function timeToFrames(time: number, sampleRate: number): number {
  return Math.round(time * sampleRate)
}

interface SoundFont2SynthesizerProcessor extends AudioWorkletProcessor {
  noteOn: (channel: number, key: number, vel: number, delayTime: number) => void
  noteOff: (channel: number, key: number, delayTime: number) => void
}

class SoundFont2SynthProcessorImpl
  extends AudioWorkletProcessor
  implements SoundFont2SynthesizerProcessor
{
  sampleRate?: number
  synth?: SoundFont2Synthesizer
  sf2Bytes?: ArrayBuffer
  _port?: MessagePort

  constructor() {
    super()

    this.port.onmessage = (event) => {
      this.onmessageForSetup(event)
    }

    this.sampleRate = undefined
    this.synth = undefined
    this.sf2Bytes = undefined
  }

  onmessageForSetup(
    event: MessageEvent<SynthesizerProcessorMessageDataForSetup>,
  ): void {
    const data = event.data
    let postData: SynthesizerNodeMessageDataForSetup

    switch (data.kind) {
      case 'sendWasmModule':
        init(WebAssembly.compile(data.wasmBytes))
          .then(() => {
            const data: SynthesizerNodeMessageDataForSetup = {
              kind: 'loadedWasmModule',
            }
            this.port.postMessage(data)
          })
          .catch(() => {
            console.error('An error occurred during wasm initialization')
          })
        this.sf2Bytes = data.sf2Bytes
        break
      case 'initializeSynthesizer': {
        if (this.sf2Bytes == null) {
          throw new Error('sf2Bytes is undefined')
        }

        this.sampleRate = data.sampleRate
        this.synth = new SoundFont2Synthesizer(
          new Uint8Array(this.sf2Bytes),
          data.sampleRate,
        )

        postData = {
          kind: 'initializedSynthesizer',
        }
        this.port.postMessage(postData)
        break
      }
      case 'connectToPort':
        this._port = event.ports[0]
        this._port.onmessage = (event) => {
          this.onmessage(event)
        }

        postData = {
          kind: 'connectedToPort',
        }
        this.port.postMessage(postData)
        break
      default:
        break
    }
  }

  onmessage(event: MessageEvent<SynthesizerEventMessageData>): void {
    const data = event.data

    switch (data.kind) {
      case 'noteOn':
        this.noteOn(data.noteNumber, data.velocity, data.delayTime)
        break
      case 'noteOff':
        this.noteOff(data.noteNumber, data.delayTime)
        break
      default:
        break
    }
  }

  noteOn(key: number, vel: number, delayTime?: number): void {
    if (this.sampleRate === undefined || this.synth === undefined) {
      return
    }

    this.synth.noteOn(key, vel, timeToFrames(delayTime ?? 0, this.sampleRate))
  }

  noteOff(key: number, delayTime?: number): void {
    if (this.sampleRate === undefined || this.synth === undefined) {
      return
    }

    this.synth.noteOff(key, timeToFrames(delayTime ?? 0, this.sampleRate))
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    if (this.synth === undefined) {
      return true
    }

    const outputChannels = outputs[0]
    const blockSize = outputChannels[0].length
    const nextBlock = this.synth.nextBlock(blockSize)
    outputChannels[0].set(nextBlock[0])
    outputChannels.length > 1 && outputChannels[1].set(nextBlock[1])

    // Returning true tells the Audio system to keep going.
    return true
  }
}

registerProcessor(PROCESSOR_NAME, SoundFont2SynthProcessorImpl)
