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
    case 'note-on':
      audioWorkletPort?.postMessage({
        type: 'note-on',
        channel: 0,
        key: 60,
        vel: 100,
        delayTime: 0,
      })
      break
    default:
      console.log(e.data)
  }
})

export {}
