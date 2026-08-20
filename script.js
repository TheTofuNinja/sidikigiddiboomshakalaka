const studentInfo = document.getElementById("studentInfo");
const preparation = document.getElementById("preparation");
const speaking = document.getElementById("speaking");
const finished = document.getElementById("finished");

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const retryBtn = document.getElementById("retryBtn");
const downloadBtn = document.getElementById("downloadBtn");

const prepTimer = document.getElementById("prepTimer");
const speakTimer = document.getElementById("speakTimer");
const recordStatus = document.getElementById("recordStatus");
const audioPlayer = document.getElementById("audioPlayer");

let prepTime = 5 * 60;
let speakTime = 5 * 60;

let prepInterval;
let speakInterval;

let mediaRecorder;
let audioChunks = [];
let audioBlob = null;
let audioURL = null;


// =========================
// FORMAT TIME
// =========================

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(secs).padStart(2, "0")
    );
}


// =========================
// START TEST
// =========================

startBtn.addEventListener("click", () => {

    const name = document.getElementById("studentName").value.trim();
    const studentClass = document.getElementById("studentClass").value.trim();

    if (!name || !studentClass) {
        alert("Vui lòng nhập tên và lớp.");
        return;
    }

    studentInfo.classList.add("hidden");
    preparation.classList.remove("hidden");

    startPreparation();
});


// =========================
// 5 MINUTE PREPARATION
// =========================

function startPreparation() {

    clearInterval(prepInterval);

    prepTime = 5 * 60;

    prepTimer.textContent = formatTime(prepTime);

    prepInterval = setInterval(() => {

        prepTime--;

        prepTimer.textContent = formatTime(prepTime);

        if (prepTime <= 0) {

            clearInterval(prepInterval);

            preparation.classList.add("hidden");
            speaking.classList.remove("hidden");

            startSpeaking();
        }

    }, 1000);
}


// =========================
// START RECORDING
// =========================

async function startSpeaking() {

    speakTime = 5 * 60;

    speakTimer.textContent = formatTime(speakTime);

    audioChunks = [];

    try {

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true
        });

        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = event => {

            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }

        };

        mediaRecorder.onstop = async () => {

            recordStatus.textContent = "Đang xử lý MP3...";

            try {

                const webmBlob = new Blob(audioChunks, {
                    type: "audio/webm"
                });

                audioBlob = await convertToMP3(webmBlob);

                audioURL = URL.createObjectURL(audioBlob);

                audioPlayer.src = audioURL;

                speaking.classList.add("hidden");
                finished.classList.remove("hidden");

            } catch (error) {

                console.error(error);

                alert("Không thể chuyển bản ghi sang MP3.");

            } finally {

                stream.getTracks().forEach(track => track.stop());

            }

        };

        mediaRecorder.start();

        recordStatus.textContent = "Đang ghi âm...";

        speakInterval = setInterval(() => {

            speakTime--;

            speakTimer.textContent = formatTime(speakTime);

            if (speakTime <= 0) {

                clearInterval(speakInterval);

                stopRecording();

            }

        }, 1000);

    } catch (error) {

        console.error(error);

        alert(
            "Không thể sử dụng microphone. " +
            "Hãy cấp quyền microphone cho trình duyệt."
        );
    }
}


// =========================
// STOP RECORDING
// =========================

function stopRecording() {

    clearInterval(speakInterval);

    if (mediaRecorder &&
        mediaRecorder.state !== "inactive") {

        mediaRecorder.stop();

    }

    recordStatus.textContent = "Đã ghi xong.";

}


// =========================
// STOP BUTTON
// =========================

stopBtn.addEventListener("click", () => {

    stopRecording();

});


// =========================
// WEBM → MP3
// =========================

async function convertToMP3(blob) {

    const arrayBuffer = await blob.arrayBuffer();

    const audioContext = new AudioContext();

    const audioBuffer =
        await audioContext.decodeAudioData(arrayBuffer);

    const sampleRate = audioBuffer.sampleRate;

    const channelCount = audioBuffer.numberOfChannels;

    const mp3Encoder = new lamejs.Mp3Encoder(
        channelCount,
        sampleRate,
        128
    );

    const mp3Data = [];

    const sampleBlockSize = 1152;

    const channels = [];

    for (let channel = 0; channel < channelCount; channel++) {

        channels.push(
            audioBuffer.getChannelData(channel)
        );

    }

    for (
        let i = 0;
        i < audioBuffer.length;
        i += sampleBlockSize
    ) {

        const left = new Int16Array(
            Math.min(
                sampleBlockSize,
                audioBuffer.length - i
            )
        );

        let right = null;

        for (let j = 0; j < left.length; j++) {

            let sample = channels[0][i + j];

            sample = Math.max(-1, Math.min(1, sample));

            left[j] =
                sample < 0
                    ? sample * 32768
                    : sample * 32767;
        }

        if (channelCount > 1) {

            right = new Int16Array(left.length);

            for (let j = 0; j < right.length; j++) {

                let sample = channels[1][i + j];

                sample = Math.max(-1, Math.min(1, sample));

                right[j] =
                    sample < 0
                        ? sample * 32768
                        : sample * 32767;
            }
        }

        const mp3buf =
            channelCount === 1
                ? mp3Encoder.encodeBuffer(left)
                : mp3Encoder.encodeBuffer(left, right);

        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }

    const end = mp3Encoder.flush();

    if (end.length > 0) {
        mp3Data.push(end);
    }

    await audioContext.close();

    return new Blob(mp3Data, {
        type: "audio/mp3"
    });
}


// =========================
// DOWNLOAD MP3
// =========================

downloadBtn.addEventListener("click", () => {

    if (!audioBlob) {
        alert("Chưa có bản ghi.");
        return;
    }

    const link = document.createElement("a");

    link.href = audioURL;

    // Tên file cố định
    link.download = "speaking.mp3";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

});


// =========================
// RETRY
// =========================

retryBtn.addEventListener("click", () => {

    clearInterval(prepInterval);
    clearInterval(speakInterval);

    if (audioURL) {
        URL.revokeObjectURL(audioURL);
    }

    audioBlob = null;
    audioURL = null;
    audioChunks = [];

    finished.classList.add("hidden");
    preparation.classList.remove("hidden");

    startPreparation();

});
