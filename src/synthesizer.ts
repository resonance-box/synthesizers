import { PROCESSOR_NAME } from './constants'
import { SoundFont2SynthesizerNodeImpl } from './node'
// eslint-disable-next-line
// @ts-ignore
import processorRaw from './generated/processor.js?raw'
// eslint-disable-next-line
// @ts-ignore
import wasmURL from './generated/wasm/synthesizers_bg.wasm?url'

const processorBlob = new Blob([processorRaw], {
  type: 'application/javascript; charset=utf-8',
})

export async function createSoundFont2Synthesizer(
  port: MessagePort,
  context: AudioContext,
  sf2URL: string | URL,
): Promise<void> {
  let node

  try {
    const response = await window.fetch(wasmURL)
    const wasmBytes = await response.arrayBuffer()

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

    node = new SoundFont2SynthesizerNodeImpl(port, context, PROCESSOR_NAME)
    node.connect(context.destination)

    const sf2Response = await fetch(sf2URL)
    const sf2Bytes = await sf2Response.arrayBuffer()

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
}
