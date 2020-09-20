function getInfo(buffer) {
	const fileChunk = {
		id: buffer.toString('ascii', 0, 4),
		size: buffer.readUInt32LE(4),
		format: buffer.toString('ascii', 8, 12),
	};

	if (fileChunk.id !== 'RIFF') throw new Error('Not a RIFF file.');
	if (fileChunk.format !== 'WAVE') throw new Error('Not a WAVE file.');

	const formatChunk = {
		id: buffer.toString('ascii', 12, 12 + 4),
		size: buffer.readUInt32LE(12 + 4),
		audioFormat: buffer.readUInt16LE(12 + 8), // 2 bytes, Audio format 1=PCM, 3=IEEE, 6=mulaw,7=alaw, 257=IBM
		channels: buffer.readUInt16LE(12 + 10), // 2 bytes, Number of channels 1=Mono 2=Stereo
		sampleRate: buffer.readUInt32LE(12 + 12), // 4 bytes, Sampling Frequency in Hz
		bytesPerSecond: buffer.readUInt32LE(12 + 16), // 4 bytes, == SampleRate * NumChannels *
		blockAlign: buffer.readUInt16LE(12 + 20), // 2 bytes, == NumChannels * BitsPerSample/8
		bitsPerSample: buffer.readUInt16LE(12 + 22), // 2 bytes, Number of bits per sample
	};

	if (formatChunk.id !== 'fmt ') throw new Error('Cannot find format chunk.');

	const dataChunkOffset = buffer.indexOf('data', 12 + formatChunk.size, 'ascii');

	if (formatChunk.id === -1) throw new Error('Cannot find data chunk.');
	if (dataChunkOffset >= buffer.length - 4)
		throw new Error('Found data chunk, but did not retrieve enough data to read size');

	const dataChunkHeader = {
		id: buffer.toString('ascii', dataChunkOffset, dataChunkOffset + 4),
		size: buffer.readUInt32LE(dataChunkOffset + 4),
	};

	return {
		sampleRate: formatChunk.sampleRate,
		channels: formatChunk.channels,
		duration: dataChunkHeader.size / formatChunk.bytesPerSecond,
	};
}

module.exports = { getInfo };
