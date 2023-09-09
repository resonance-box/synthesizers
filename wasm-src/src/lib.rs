use oxisynth::{MidiEvent, SoundFont, Synth, SynthDescriptor};
use std::io::Cursor;
use wasm_bindgen::prelude::*;

const CHANNEL: u8 = 0;

struct ScheduledMidiEvent {
    frame: usize,
    event: MidiEvent,
}

#[wasm_bindgen]
pub struct SoundFont2Synthesizer {
    synth: Synth,
    current_frame: usize,
    scheduled_events: Vec<ScheduledMidiEvent>,
}

#[wasm_bindgen]
impl SoundFont2Synthesizer {
    #[wasm_bindgen(constructor)]
    pub fn new(sf2_bytes: &[u8], sample_rate: f32) -> SoundFont2Synthesizer {
        let mut synth = Synth::new(SynthDescriptor {
            sample_rate,
            ..Default::default()
        })
        .unwrap();

        let mut cur = Cursor::new(sf2_bytes);
        let font = SoundFont::load(&mut cur).unwrap();
        synth.add_font(font, true);

        SoundFont2Synthesizer {
            synth,
            current_frame: 0,
            scheduled_events: vec![],
        }
    }

    #[wasm_bindgen(js_name = "noteOn")]
    pub fn note_on(&mut self, key: u8, vel: u8, delay_frame: Option<usize>) {
        if let Some(delay_frame) = delay_frame {
            let frame = self.current_frame + delay_frame;
            let idx = self.scheduled_events.partition_point(|e| e.frame > frame);

            self.scheduled_events.insert(
                idx,
                ScheduledMidiEvent {
                    frame,
                    event: MidiEvent::NoteOn {
                        channel: CHANNEL,
                        key,
                        vel,
                    },
                },
            );
        } else {
            self.note_on_immediately(key, vel);
        }
    }

    fn note_on_immediately(&mut self, key: u8, vel: u8) {
        self.synth
            .send_event(MidiEvent::NoteOn {
                channel: CHANNEL,
                key,
                vel,
            })
            .ok();
    }

    #[wasm_bindgen(js_name = "noteOff")]
    pub fn note_off(&mut self, key: u8, delay_frame: Option<usize>) {
        if let Some(delay_frame) = delay_frame {
            let frame = self.current_frame + delay_frame;
            let idx = self.scheduled_events.partition_point(|e| e.frame > frame);

            self.scheduled_events.insert(
                idx,
                ScheduledMidiEvent {
                    frame,
                    event: MidiEvent::NoteOff {
                        channel: CHANNEL,
                        key,
                    },
                },
            );
        } else {
            self.note_off_immediately(key);
        }
    }

    fn note_off_immediately(&mut self, key: u8) {
        self.synth
            .send_event(MidiEvent::NoteOff {
                channel: CHANNEL,
                key,
            })
            .ok();
    }

    fn process_scheduled_events(&mut self) {
        while let Some(event) = self.scheduled_events.last() {
            if event.frame > self.current_frame {
                break;
            }

            match event.event {
                MidiEvent::NoteOn {
                    channel: _,
                    key,
                    vel,
                } => self.note_on_immediately(key, vel),
                MidiEvent::NoteOff { channel: _, key } => self.note_off_immediately(key),
                _ => (),
            }

            self.scheduled_events.pop();
        }
    }

    #[wasm_bindgen(js_name = "nextBlock")]
    pub fn next_block(&mut self, block_size: usize) -> JsValue {
        self.current_frame += block_size;
        self.process_scheduled_events();

        let mut out = vec![
            Vec::with_capacity(block_size),
            Vec::with_capacity(block_size),
        ];

        for _ in 0..block_size {
            let (l, r) = self.synth.read_next();
            out[0].push(l);
            out[1].push(r);
        }

        serde_wasm_bindgen::to_value(&out).unwrap()
    }
}
