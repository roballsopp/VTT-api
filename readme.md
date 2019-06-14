# VTT Creator Backend

The backend part of a tool for creating and editing [Web Video Text Track (WebVTT)](https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API) files in your browser.

Check out the demo [here](https://roballsopp.github.io/vtt-creator/).

The frontend app is currently more interesting. Check it out [here](https://github.com/roballsopp/vtt-creator).

## Development
To get started, you'll need to create a file in the project root called `.env.dev`. This file needs to contain the following environment variables:
```bash
PORT=3001
NODE_ENV=development
GOOGLE_APPLICATION_CREDENTIALS=gcp_credentials.json
```
The `PORT` variable specifies what port the app will listen for requests on. If you set it to `PORT=3002` for example, you can make requests to `http://localhost:3002`. Whatever you set this to, make sure the `API_URL` env var in the frontend application is pointing to the matching port.

The `GOOGLE_APPLICATION_CREDENTIALS` variable specifies the path to your Google Cloud Provider credentials file. If you plan to use [Cloud Speech-to-Text](https://cloud.google.com/speech-to-text/docs/) to extract the text for your captions (which is kind of the point of the backend app), you'll need to [create this file](https://cloud.google.com/docs/authentication/getting-started), put it somewhere in this project (root is a great spot ;)), and point this variable at it.

Once your environment is good to go, open a terminal window and navigate to the project root. Install dependencies with:
```bash
yarn
```
To run the app, run:
```bash
yarn start
```

## Useful ffmpeg commands:
Extract first 6.5 seconds from an audio clip (https://stackoverflow.com/questions/7945747/how-can-you-only-extract-30-seconds-of-audio-using-ffmpeg)
```bash
ffmpeg -ss 0 -t 6.5 -i volvo_1.wav volvo_1_short.wav
```

Extract audio from video (https://ffmpeg.org/ffmpeg.html#Audio-Options)
```bash
ffmpeg -i "Volvo - Use the Code.mp4" -f wav -ar 44100 -ac 1 -sample_fmt s16 -vn volvo_1.wav
```
