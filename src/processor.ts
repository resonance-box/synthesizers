import './text-encoder-decoder.js'

import { PROCESSOR_NAME } from './constants.js'
import init, { SoundFont2Synthesizer } from './generated/wasm/synthesizers'
import {
  type SoundFont2SynthNodeMessageData,
  type SoundFont2SynthProcessorMessageData,
} from './types'

interface SoundFont2SynthProcessor extends AudioWorkletProcessor {
  noteOn: (channel: number, key: number, vel: number, delayTime: number) => void
  noteOff: (channel: number, key: number, delayTime: number) => void
}

class SoundFont2SynthProcessorImpl
  extends AudioWorkletProcessor
  implements SoundFont2SynthProcessor
{
  synth?: SoundFont2Synthesizer
  sf2Bytes?: ArrayBuffer
  connectedPort?: MessagePort

  constructor() {
    super()

    this.port.onmessage = (event) => {
      this.onmessage(event)
    }

    this.synth = undefined
    this.sf2Bytes = undefined
  }

  onmessage(event: MessageEvent<SoundFont2SynthProcessorMessageData>): void {
    const data = event.data
    let postData: SoundFont2SynthNodeMessageData

    switch (data.type) {
      case 'send-wasm-module':
        init(WebAssembly.compile(data.wasmBytes))
          .then(() => {
            const data: SoundFont2SynthNodeMessageData = {
              type: 'wasm-module-loaded',
            }
            this.port.postMessage(data)
          })
          .catch(() => {
            console.error('An error occurred during wasm initialization')
          })
        this.sf2Bytes = data.sf2Bytes
        break
      case 'init-synth': {
        if (this.sf2Bytes == null) {
          throw new Error('sf2Bytes is undefined')
        }

        this.synth = SoundFont2Synthesizer.new(
          new Uint8Array(this.sf2Bytes),
          data.sampleRate,
        )

        postData = {
          type: 'init-completed-synth',
        }
        this.port.postMessage(postData)
        break
      }
      case 'connect-to-port':
        this.connectedPort = event.ports[0]
        this.connectedPort.onmessage = (event) => {
          this.onmessage(event)
        }

        postData = {
          type: 'connected-to-port',
        }
        this.port.postMessage(postData)
        break
      case 'note-on':
        this.noteOn(data.channel, data.key, data.vel, data.delayTime)
        break
      case 'note-off':
        this.noteOff(data.channel, data.key, data.delayTime)
        break
      default:
        break
    }
  }

  noteOn(channel: number, key: number, vel: number, delayTime?: number): void {
    if (this.synth == null) return
    this.synth.note_on(channel, key, vel, delayTime)
  }

  noteOff(channel: number, key: number, delayTime?: number): void {
    if (this.synth == null) return
    this.synth.note_off(channel, key, delayTime)
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    if (this.synth == null) return true

    const outputChannels = outputs[0]
    const blockSize = outputChannels[0].length
    const nextBlock = this.synth.read_next_block(blockSize)
    outputChannels[0].set(nextBlock[0])
    outputChannels.length > 1 && outputChannels[1].set(nextBlock[1])

    // Returning true tells the Audio system to keep going.
    return true
  }
}

registerProcessor(PROCESSOR_NAME, SoundFont2SynthProcessorImpl)
