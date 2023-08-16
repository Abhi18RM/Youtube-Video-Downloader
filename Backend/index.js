import express from "express";
import fs from "fs";
import ytdl from "ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import path from "path";

const app = express();
app.use(express.static("public"));
const baseDirectory = process.cwd(); 

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

app.get("/", async (req, res) => {
    res.status(200).send("Home Page");
});

app.get("/download/:filename", async(req,res)=>{
    const fileName = req.params.filename + ".mp4";
    const filePath = path.join(baseDirectory,"public",fileName);
    if (fs.existsSync(filePath)){
        res.download(filePath,fileName);
    }else{
        res.status(404).send("File not found");
    }
});

app.post("/", async (req, res) => {
    const videoURL = req.query.url;
    const videoId = ytdl.getVideoID(videoURL);
        // "https://www.youtube.com/watch?v=3WaxQMELSkw&list=PLgUwDviBIf0pwFf-BnpkXxs0Ra0eU2sJY&index=6";
    try {
        const paths = [];
        const info = await ytdl.getBasicInfo(videoURL);
        //getting the highest quaility ie 1080p
        const video = ytdl.chooseFormat(info.formats, {quality: "137"});
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
        paths.push(videoPath);
        paths.push(audioPath);

        videoStream.pipe(fs.createWriteStream(videoPath));
        audioStream.pipe(fs.createWriteStream(audioPath));

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
            .on("end", () => {
                console.log("Merging complete");
                paths.forEach((path)=>{
                    fs.unlinkSync(path, (err)=>{
                        if (err) {
                            console.log(err);
                        }else{
                            console.log("File deleted successfully");
                        }
                    })
                });
                res.status(200).send({videoId});
            })
            .on("error", (err) => {
                console.error("Error:", err);
            })
            .run();

    } catch (err) {
        res.status(500).send(err);
    }
});

app.listen(8800, () => {
    console.log("Running on port 8800");
});
