## Useful ffmpeg commands:
Extract first 6.5 seconds from an audio clip (https://stackoverflow.com/questions/7945747/how-can-you-only-extract-30-seconds-of-audio-using-ffmpeg)
```bash
ffmpeg -ss 0 -t 6.5 -i volvo_1.wav volvo_1_short.wav
```

Extract audio from video (https://ffmpeg.org/ffmpeg.html#Audio-Options)
```bash
ffmpeg -i "Volvo - Use the Code.mp4" -f wav -ar 44100 -ac 1 -sample_fmt s16 -vn volvo_1.wav
```
