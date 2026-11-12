"""
Speak a list of words with Piper, one WAV file per word.

Piper is a neural voice: it is the difference between a course that sounds
like a sat-nav and one that sounds like a language. The model is loaded once
and reused, because loading it per word would cost more than the synthesis.

The words come from a JSON file, and the WAVs are written to a folder, one
file per word, numbered in the order they were given.
"""
import argparse
import json
import os
import wave

from piper import PiperVoice


def main() -> None:
    parser = argparse.ArgumentParser(description="Speak words with Piper")
    parser.add_argument("--model", required=True, help="path to the .onnx voice model")
    parser.add_argument("--out", required=True, help="folder for the WAV files")
    parser.add_argument("--words", required=True, help="JSON file holding a list of words")
    arguments = parser.parse_args()

    with open(arguments.words, encoding="utf-8") as handle:
        words = json.load(handle)

    os.makedirs(arguments.out, exist_ok=True)
    voice = PiperVoice.load(arguments.model)

    for index, word in enumerate(words):
        path = os.path.join(arguments.out, f"{index}.wav")
        with wave.open(path, "wb") as wav_file:
            voice.synthesize_wav(word, wav_file)

        if (index + 1) % 50 == 0:
            print(f"  {index + 1} of {len(words)} words", flush=True)

    print(f"spoke {len(words)} words", flush=True)


if __name__ == "__main__":
    main()
