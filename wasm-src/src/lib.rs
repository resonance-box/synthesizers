use oxisynth::{MidiEvent, SoundFont, Synth, SynthDescriptor};
use std::io::Cursor;
use wasm_bindgen::prelude::*;

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

    pub fn note_on(&mut self, channel: u8, key: u8, vel: u8, delay_frame: Option<usize>) {
        if let Some(delay_frame) = delay_frame {
            let frame = self.current_frame + delay_frame;
            let idx = self.scheduled_events.partition_point(|e| e.frame > frame);

            self.scheduled_events.insert(
                idx,
                ScheduledMidiEvent {
                    frame,
                    event: MidiEvent::NoteOn { channel, key, vel },
                },
            );
        } else {
            self.note_on_immediately(channel, key, vel);
        }
    }

    fn note_on_immediately(&mut self, channel: u8, key: u8, vel: u8) {
        self.synth
            .send_event(MidiEvent::NoteOn { channel, key, vel })
            .ok();
    }

    pub fn note_off(&mut self, channel: u8, key: u8, delay_frame: Option<usize>) {
        if let Some(delay_frame) = delay_frame {
            let frame = self.current_frame + delay_frame;
            let idx = self.scheduled_events.partition_point(|e| e.frame > frame);

            self.scheduled_events.insert(
                idx,
                ScheduledMidiEvent {
                    frame,
                    event: MidiEvent::NoteOff { channel, key },
                },
            );
        } else {
            self.note_off_immediately(channel, key);
        }
    }

    fn note_off_immediately(&mut self, channel: u8, key: u8) {
        self.synth
            .send_event(MidiEvent::NoteOff { channel, key })
            .ok();
    }

    fn process_scheduled_events(&mut self) {
        while let Some(event) = self.scheduled_events.last() {
            if event.frame > self.current_frame {
                break;
            }

            match event.event {
                MidiEvent::NoteOn { channel, key, vel } => {
                    self.note_on_immediately(channel, key, vel)
                }
                MidiEvent::NoteOff { channel, key } => self.note_off_immediately(channel, key),
                _ => (),
            }

            self.scheduled_events.pop();
        }
    }

    pub fn read_next_block(&mut self, block_size: usize) -> JsValue {
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
