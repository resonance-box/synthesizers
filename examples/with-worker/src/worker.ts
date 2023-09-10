let audioWorkletPort: MessagePort | undefined = undefined
const onMessageFromAudioWorklet = (e: MessageEvent) => {
  console.log(e.data)
}

self.addEventListener('message', (e) => {
  switch (e.data) {
    case 'connect':
      audioWorkletPort = e.ports[0]
      audioWorkletPort.onmessage = onMessageFromAudioWorklet
      break
    case 'noteOn':
      audioWorkletPort?.postMessage({
        kind: 'noteOn',
        noteNumber: 60,
        velocity: 100,
        delayTime: 0,
      })
      break
    default:
      console.log(e.data)
  }
})

export {}
