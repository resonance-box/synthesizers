import { createSoundFont2Synthesizer } from '@resonance-box/synthesizers'
import { useState } from 'react'
import './App.css'
import reactLogo from './assets/react.svg'
import Worker from './worker.ts?worker'
import viteLogo from '/vite.svg'

const channel = new MessageChannel()
const worker = new Worker()
worker.postMessage('connect', [channel.port1])

function App() {
  const [started, setStarted] = useState(false)

  if (!started) {
    return (
      <button
        onClick={async () => {
          const context = new AudioContext()
          const url = new URL(
            './assets/GeneralUser GS v1.471.sf2',
            import.meta.url,
          )
          await createSoundFont2Synthesizer(channel.port2, context, url)
          setStarted(true)
        }}
      >
        Start
      </button>
    )
  }

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React + Worker + Audio Worklet</h1>
      <div className="card">
        <button
          disabled={!started}
          onClick={() => worker.postMessage('noteOn')}
        >
          NoteOn
        </button>
      </div>
    </>
  )
}

export default App
