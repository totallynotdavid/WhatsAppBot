const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const os = require("os");

class MediaConverterService {
    async convertGifToMp4(gifUrl) {
        const tempDir = os.tmpdir();
        const inputPath = path.join(tempDir, `input_${Date.now()}.gif`);
        const outputPath = path.join(tempDir, `output_${Date.now()}.mp4`);

        // Download the GIF
        const response = await fetch(gifUrl);
        const buffer = await response.buffer();
        fs.writeFileSync(inputPath, buffer);

        // Convert GIF to MP4
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions("-movflags faststart")
                .outputOptions("-pix_fmt yuv420p")
                .outputOptions("-vf scale=trunc(iw/2)*2:trunc(ih/2)*2")
                .save(outputPath)
                .on("end", () => {
                    const mp4Buffer = fs.readFileSync(outputPath);
                    fs.unlinkSync(inputPath);
                    fs.unlinkSync(outputPath);
                    resolve(mp4Buffer);
                })
                .on("error", err => {
                    fs.unlinkSync(inputPath);
                    reject(err);
                });
        });
    }
}

module.exports = new MediaConverterService();
