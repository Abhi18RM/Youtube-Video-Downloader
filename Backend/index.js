import express from "express";
import fs from "fs";
import ytdl from "ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import path, { resolve } from "path";

const app = express();
app.use(express.static("public"));
const baseDirectory = process.cwd();

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

app.get("/", async (req, res) => {
    res.status(200).send("Home Page");
});

app.get("/download/:filename", async (req, res) => {
    const fileName = req.params.filename + ".mp4";
    const filePath = path.join(baseDirectory, "public", fileName);
    if (fs.existsSync(filePath)) {
        res.download(filePath, fileName, async (err) => {
            if (err) {
                console.error(err);
                res.status(500).send("Error during download");
            } else {
                try {
                    await fs.promises.unlink("public/" + fileName);
                    console.log(`File ${fileName} is deleted`);
                } catch (unlinkErr) {
                    console.error("Error deleting file", unlinkErr);
                }
            }
        });
    } else {
        res.status(404).send("File not found");
    }
});

app.post("/", async (req, res) => {
    const videoURL = req.query.url;
    if (ytdl.validateURL(videoURL)) {
        const videoId = ytdl.getVideoID(videoURL);
        try {
            const info = await ytdl.getBasicInfo(videoURL);
            //getting the highest quaility ie 1080p
            const video = ytdl.chooseFormat(info.formats, { quality: "137" });
            //getting audio
            const audio = ytdl.chooseFormat(info.formats, { quality: "140" });
            //Parsing the format type
            const mimeType = video.mimeType.split(";");
            const mimePart1 = mimeType[0].split("/")[1];

            // Download video with audio and pipe to the writable stream
            const videoStream = ytdl(videoURL, { format: video });
            const audioStream = ytdl(videoURL, { format: audio });

            const videoPath = `temp_${Date.now()}.mp4`;
            const audioPath = `temp_${Date.now()}.aac`;

            videoStream.pipe(fs.createWriteStream(videoPath));
            audioStream.pipe(fs.createWriteStream(audioPath));

            console.log("video and audio files downloaded");
            console.log("now about to merge");

            await Promise.all([
                new Promise((resolve) => videoStream.on("end", resolve)),
                new Promise((resolve) => audioStream.on("end", resolve)),
            ]);

            const pub = "public";
            const mergedPath = `${pub}/${videoId}.${mimePart1}`;
            ffmpeg()
                .input(videoPath)
                .input(audioPath)
                .outputOptions("-c:v", "copy")
                .outputOptions("-c:a", "aac")
                .outputOptions("-strict", "experimental")
                .output(mergedPath)
                .on("end", async () => {
                    console.log("Merging complete");
                    await Promise.all([
                        new Promise((resolve) => fs.unlink(videoPath, resolve)),
                        new Promise((resolve) => fs.unlink(audioPath, resolve)),
                    ]);
                    res.status(200).send({ videoId });
                })
                .on("error", (err) => {
                    console.error("Error:", err);
                })
                .run();

        } catch (err) {
            res.status(500).send(err);
        }
    }else{
        res.status(500).send("Not a valid URL");
    }
});

app.listen(8800, () => {
    console.log("Running on port 8800");
});
