const moment = require('moment');
// http://bbc.github.io/subtitle-guidelines/
// ideally follow these guidelines:
// - 160-180 words per minute
// - 37 fixed-width (monospaced) characters per line OR 68% of the width of a 16:9 video and 90% of the width of a 4:3 video
// - break at natural points: http://bbc.github.io/subtitle-guidelines/#Break-at-natural-points

// type WordsList = Array<{
// 	startTime: string, // "10.500s"
// 	endTime: string, // "12.600s"
// 	word: string // the word itself
// }>;
function getVTTFromWords(wordsList) {
	let cursor = 0;
	const numWords = wordsList.length;
	const lines = [];

	while (cursor < numWords) {
		const [line, wordCount] = getNextLine(wordsList, cursor);
		lines.push(line);
		cursor += wordCount;
	}

	return linesToVTT(lines);
}

function getNextLine(wordsList, cursor) {
	let charCount = 0;
	const endOfList = wordsList.length;
	const start = cursor;
	while (charCount < 40 && cursor < endOfList) {
		const wordData = wordsList[cursor];
		charCount += wordData.word.length;
		cursor++;
	}

	return [
		{
			startTime: wordsList[start].startTime,
			endTime: wordsList[cursor - 1].endTime,
			transcript: joinWords(wordsList, start, cursor),
		},
		cursor - start,
	];
}

function joinWords(wordsList, from, to) {
	const numWordsToJoin = to - from;
	// TODO: does using the Array constructor this way actually help with memory allocation?
	const wordsToJoin = new Array(numWordsToJoin);
	for (let i = 0; i < numWordsToJoin; i++) {
		wordsToJoin[i] = wordsList[from + i].word;
	}
	return wordsToJoin.join(' ');
}

function linesToVTT(lines) {
	return lines
		.reduce(
			(file, nextLine) => {
				const start = formatVTTTime(nextLine.startTime);
				const end = formatVTTTime(nextLine.endTime);
				file.push(`${start} --> ${end}`, nextLine.transcript + '\n');
				return file;
			},
			['WEBVTT - Some title\n']
		)
		.join('\n');
}

// `seconds` is actually a string with an s on the end (e.g. "10.500s")
function formatVTTTime(seconds) {
	return moment(parseFloat(seconds.slice(0, -1)) * 1000).format('mm:ss:SSS');
}

module.exports = {
	getVTTFromWords,
};
