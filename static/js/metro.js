import Timer from './timer.js';

const tempoDisplay = document.querySelector('.tempo');
const decreaseTempoBtn = document.querySelector('.decrease-tempo');
const increaseTempoBtn = document.querySelector('.increase-tempo');
const tempoSlider = document.querySelector('.slider');
const startStopBtn = document.querySelector('.start-stop');
const subtractBeats = document.querySelector('.subtract-beats');
const addBeats = document.querySelector('.add-beats');
const measureCount = document.querySelector('.measure-count');
const changeSound = document.querySelector('.selector');

const click1 = new Audio('../static/audio/click1.mp3');
const click2 = new Audio('../static/audio/click2.wav');
const click3 = new Audio('../static/audio/click3.wav');
const click4 = new Audio('../static/audio/click4.wav');

let bpm = 140;
let beatsPerMeasure = 4;
let count = 0;
let isRunning = false;
let sound = 'click2';

decreaseTempoBtn.addEventListener('click', () => {
    if (bpm <= 20) { return };
    bpm--;
    validateTempo();
    updateMetronome();
});
increaseTempoBtn.addEventListener('click', () => {
    if (bpm >= 280) { return };
    bpm++;
    validateTempo();
    updateMetronome();
});
tempoSlider.addEventListener('input', () => {
    bpm = tempoSlider.value;

    validateTempo();
    updateMetronome();
});

subtractBeats.addEventListener('click', () => {
    if (beatsPerMeasure <= 2) { return };
    beatsPerMeasure--;
    measureCount.textContent = beatsPerMeasure;
    count = 0;
});
addBeats.addEventListener('click', () => {
    if (beatsPerMeasure >= 12) { return };
    beatsPerMeasure++;
    measureCount.textContent = beatsPerMeasure;
    count = 0;
});

startStopBtn.addEventListener('click', () => {
    count = 0;
    if (!isRunning) {
        metronome.start();
        startRecording();
        isRunning = true;
        startStopBtn.textContent = 'STOP';
    } else {
        stopRecording();        
        metronome.stop(); 
        isRunning = false;
        startStopBtn.textContent = 'START';
    }
});

changeSound.addEventListener('change', () => {
    sound = changeSound.value
})

function updateMetronome() {
    tempoDisplay.textContent = bpm;
    tempoSlider.value = bpm;
    metronome.timeInterval = 60000 / bpm;
}
function validateTempo() {
    if (bpm <= 20) { return };
    if (bpm >= 280) { return };
}

function playClick() {
    interval_global = 60 / bpm;
    if (count === beatsPerMeasure) {
        count = 0;
    }
    if (count === 0) {
        click1.play();
        click1.currentTime = 0;
        console.log(`This is downbeat, the time is ${Date.now()}`);
    } else {
      if (sound === 'click2') {
        click2.play();
        click2.currentTime = 0;
      }
      if (sound === 'click3') {
        click3.play();
        click3.currentTime = 0;
      }
      if (sound === 'click4') {
        click4.play();
        click4.currentTime = 0;
      }
    }
    count++;
}

const metronome = new Timer(playClick, 60000 / bpm, { immediate: true });