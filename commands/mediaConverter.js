const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const ffmpeg = require("fluent-ffmpeg");

const execAsync = util.promisify(exec);

class MediaConverter {
    static async imageToWebp(inputPath, outputPath) {
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .addOutputOptions([
                    "-vcodec",
                    "libwebp",
                    "-vf",
                    // eslint-disable-next-line no-useless-escape
                    "scale='iw*min(300/iw,300/ih)':'ih*min(300/iw,300/ih)',format=rgba,pad=300:300:'(300-iw)/2':'(300-ih)/2':'#00000000',setsar=1,fps=10",
                    "-loop",
                    "0",
                    "-ss",
                    "00:00:00.0",
                    "-t",
                    "00:00:05.0",
                    "-preset",
                    "default",
                    "-an",
                    "-vsync",
                    "0",
                    "-s",
                    "512:512",
                ])
                .toFormat("webp")
                .on("end", resolve)
                .on("error", reject)
                .save(outputPath);
        });
    }

    static async videoToAnimatedWebp(inputPath, outputPath) {
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .inputOptions("-t 10") // Limit to 10 seconds
                .outputOptions(
                    "-vf",
                    "fps=15,scale=512:512:force_original_aspect_ratio=decrease,crop=512:512"
                )
                .toFormat("webp")
                .on("end", resolve)
                .on("error", reject)
                .save(outputPath);
        });
    }

    static async webpToImage(inputPath, outputPath) {
        try {
            const command = `magick convert "${inputPath}" "${outputPath}"`;
            await exec(command);
        } catch (error) {
            console.error("Error converting WebP to PNG:", error);
            throw error;
        }
    }

    static async animatedWebpToVideo(inputPath, outputPath) {
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions(
                    "-vf",
                    "scale=512:512:force_original_aspect_ratio=decrease,crop=512:512"
                )
                .toFormat("mp4")
                .on("end", resolve)
                .on("error", reject)
                .save(outputPath);
        });
    }

    static async isAnimatedWebp(filePath) {
        try {
            const { stdout } = await execAsync(
                `identify -format "%n\n" ${filePath}`
            );
            return parseInt(stdout.trim()) > 1;
        } catch (error) {
            console.error("Error checking if WebP is animated:", error);
            return false;
        }
    }

    static isAnimatedMedia(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return [".gif", ".mp4", ".webm", ".gifv"].includes(ext);
    }
}

module.exports = MediaConverter;
