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
let audioBlob;
let audioURL;


// -------------------------
// Utility
// -------------------------

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(secs).padStart(2, "0")
    );
}


// -------------------------
// Start test
// -------------------------

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


// -------------------------
// Preparation timer
// -------------------------

function startPreparation() {

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


// -------------------------
// Speaking
// -------------------------

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

        mediaRecorder.onstop = () => {

            audioBlob = new Blob(audioChunks, {
                type: "audio/webm"
            });

            audioURL = URL.createObjectURL(audioBlob);

            audioPlayer.src = audioURL;

            speaking.classList.add("hidden");
            finished.classList.remove("hidden");

            stream.getTracks().forEach(track => track.stop());

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


// -------------------------
// Stop recording
// -------------------------

function stopRecording() {

    if (mediaRecorder && mediaRecorder.state !== "inactive") {

        mediaRecorder.stop();

    }

    clearInterval(speakInterval);

    recordStatus.textContent = "Đã ghi xong.";

}


// -------------------------
// Stop button
// -------------------------

stopBtn.addEventListener("click", () => {

    stopRecording();

});


// -------------------------
// Download
// -------------------------

downloadBtn.addEventListener("click", () => {

    if (!audioBlob) {
        return;
    }

    const name =
        document.getElementById("studentName").value.trim() ||
        "student";

    const studentClass =
        document.getElementById("studentClass").value.trim() ||
        "class";

    const filename =
        `${name}_${studentClass}_speaking.webm`;

    const link = document.createElement("a");

    link.href = audioURL;
    link.download = filename;

    link.click();

});


// -------------------------
// Retry
// -------------------------

retryBtn.addEventListener("click", () => {

    if (audioURL) {
        URL.revokeObjectURL(audioURL);
    }

    finished.classList.add("hidden");

    preparation.classList.remove("hidden");

    startPreparation();

});
