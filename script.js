/**
 * Configuration
 */
const CONFIG = {
    ticksPerSecond: 20,
    totalTicks: 400, // 20 Seconds
    pitchRange: 25   // 0 - 24
};

const COLORS = ['#00bcd4', '#ff9800', '#8bc34a', '#e91e63', '#9c27b0'];
const INSTRUMENTS = ['harp', 'bass', 'guitar', 'banjo', 'pling'];

/**
 * State
 */
let songData = []; // Array of { tick, inst, pitch }
let isPlaying = false;
let currentTick = 0;
let playbackInterval = null;
let selectedInst = 0;

// DOM
const grid = document.getElementById('sequencerGrid');
const playhead = document.createElement('div'); playhead.className = 'playhead';
const timeCurrent = document.getElementById('currentTime');
const timeTotal = document.getElementById('totalTime');
const progress = document.getElementById('progressBar');

/**
 * Init
 */
function init() {
    renderGrid();
    setupListeners();
    updateTime();
}

/**
 * Render Grid
 */
function renderGrid() {
    // 40px Key Column + Ticks Columns
    grid.style.gridTemplateColumns = `40px repeat(${CONFIG.totalTicks}, 35px)`;
    grid.style.gridTemplateRows = `repeat(${CONFIG.pitchRange}, 28px)`;
    
    grid.appendChild(playhead);

    for (let pitch = CONFIG.pitchRange - 1; pitch >= 0; pitch--) {
        // Sticky Key
        const key = document.createElement('div');
        key.className = 'key-label';
        key.innerText = pitch;
        key.style.gridColumn = 1;
        key.style.gridRow = CONFIG.pitchRange - pitch;
        grid.appendChild(key);

        // Cells
        for (let tick = 0; tick < CONFIG.totalTicks; tick++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            if (tick % 4 === 0) cell.classList.add('beat');
            
            cell.style.gridColumn = tick + 2;
            cell.style.gridRow = CONFIG.pitchRange - pitch;
            
            cell.onclick = () => toggleNote(tick, pitch, cell);
            grid.appendChild(cell);
        }
    }
}

/**
 * Note Logic
 */
function toggleNote(tick, pitch, cell) {
    const index = songData.findIndex(n => n.tick === tick && n.pitch === pitch);
    
    if (index > -1) {
        songData.splice(index, 1);
        cell.innerHTML = '';
    } else {
        songData.push({ tick, pitch, inst: selectedInst });
        const note = document.createElement('div');
        note.className = 'note';
        note.style.backgroundColor = COLORS[selectedInst];
        note.style.color = COLORS[selectedInst];
        cell.appendChild(note);
        playPreview(selectedInst, pitch);
    }
}

function playPreview(inst, pitch) {
    const name = INSTRUMENTS[inst];
    new Audio(`noteblock/${name}/${pitch}.ogg`).play().catch(() => {});
}

/**
 * Playback System (Fixed)
 */
function play() {
    if (isPlaying) return;
    isPlaying = true;
    
    const speed = parseFloat(document.getElementById('speedInput').value) || 1.0;
    const ms = (1000 / CONFIG.ticksPerSecond) / speed;

    playbackInterval = setInterval(() => {
        if (currentTick >= CONFIG.totalTicks) {
            stop();
            return;
        }

        // Play notes
        const notes = songData.filter(n => n.tick === currentTick);
        notes.forEach(n => playPreview(n.inst, n.pitch));

        updateUI();
        currentTick++;
    }, ms);
}

function pause() {
    isPlaying = false;
    if (playbackInterval) clearInterval(playbackInterval);
}

function stop() {
    pause();
    currentTick = 0;
    updateUI();
}

function updateUI() {
    // Move Playhead (40px offset)
    const pos = 40 + (currentTick * 35);
    playhead.style.left = `${pos}px`;

    // Auto Scroll
    const viewport = document.querySelector('.sequencer-viewport');
    if (pos > viewport.scrollLeft + viewport.clientWidth || pos < viewport.scrollLeft) {
        viewport.scrollLeft = pos - 100;
    }

    // Time & Progress
    progress.value = (currentTick / CONFIG.totalTicks) * 100;
    updateTime();
}

function updateTime() {
    const cur = Math.floor(currentTick / 20);
    const tot = Math.floor(CONFIG.totalTicks / 20);
    timeCurrent.innerText = fmt(cur);
    timeTotal.innerText = fmt(tot);
}

function fmt(s) {
    return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
}

/**
 * Listeners
 */
function setupListeners() {
    document.getElementById('playBtn').onclick = play;
    document.getElementById('pauseBtn').onclick = pause;
    document.getElementById('stopBtn').onclick = stop;
    
    document.getElementById('instrumentSelect').onchange = (e) => selectedInst = parseInt(e.target.value);
    
    progress.oninput = (e) => {
        const wasPlaying = isPlaying;
        if(wasPlaying) pause();
        currentTick = Math.floor((e.target.value / 100) * CONFIG.totalTicks);
        updateUI();
        if(wasPlaying) play();
    };

    document.getElementById('downloadBtn').onclick = generateFile;
}

/**
 * FILE GENERATION
 * Output: .js file (Text content renamed to .js)
 */
function generateFile() {
    const id = Math.floor(Math.random() * 900) + 100;
    const speed = document.getElementById('speedInput').value;

    // Sort chronologically
    songData.sort((a, b) => a.tick - b.tick);

    // Build the string content
    const dataStr = songData.map(n => `[${n.tick},${n.inst},${n.pitch}]`).join(',');

    const content = `/**
 * Bedrock Music API - Track ${id}
 * Originally generated text, saved as JS module.
 */
export const Music${id} = {
    id: ${id},
    speed: ${speed},
    instruments: ["note.harp", "note.bass", "note.guitar", "note.banjo", "note.pling"],
    data: [${dataStr}], // [tick, inst, pitch]
    getNotesAt(tick) {
        return this.data.filter(n => n[0] === tick).map(n => ({
            sound: this.instruments[n[1]],
            pitch: Math.pow(2, (n[2] - 12) / 12)
        }));
    }
};`;

    // Create Blob as text/plain to simulate "renaming txt to js"
    // But force filename extension to .js
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `music${id}.js`; // Force extension here
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

init();
