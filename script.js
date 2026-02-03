/**
 * Configuration
 */
const CONFIG = {
    ticksPerSecond: 20,
    totalTicks: 400, // 20 seconds
    pitchRange: 25   // 0 to 24
};

// Instrument Mapping (Index -> Name)
const INSTRUMENTS = ['harp', 'bass', 'guitar', 'banjo', 'pling'];
const INSTRUMENT_COLORS = ['#00bcd4', '#ff9800', '#8bc34a', '#e91e63', '#9c27b0'];

/**
 * App State
 */
let songData = []; // Format: { tick: int, inst: int, pitch: int }
let isPlaying = false;
let currentTick = 0;
let playbackInterval = null;
let selectedInstrument = 0; // Index 0-4

// DOM Elements
const sequencer = document.getElementById('sequencer');
const keyContainer = document.querySelector('.piano-roll-keys');
const progressBar = document.getElementById('progressBar');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');

/**
 * Initialization
 */
function init() {
    renderGrid();
    setupListeners();
    updateTimeDisplay();
}

/**
 * Render the Grid
 */
function renderGrid() {
    // Set CSS Grid dimensions
    sequencer.style.display = 'grid';
    sequencer.style.gridTemplateColumns = `repeat(${CONFIG.totalTicks}, 30px)`;
    sequencer.style.gridTemplateRows = `repeat(${CONFIG.pitchRange}, 24px)`;

    // 1. Generate Rows (High pitch at top, Low at bottom)
    for (let pitch = CONFIG.pitchRange - 1; pitch >= 0; pitch--) {
        
        // Key Label (Left Sidebar)
        const key = document.createElement('div');
        key.className = 'key-label';
        key.innerText = pitch;
        keyContainer.appendChild(key);

        // Grid Cells
        for (let tick = 0; tick < CONFIG.totalTicks; tick++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.tick = tick;
            cell.dataset.pitch = pitch;
            
            cell.addEventListener('mousedown', () => toggleNote(tick, pitch, cell));
            sequencer.appendChild(cell);
        }
    }
}

/**
 * Toggle Note Logic
 */
function toggleNote(tick, pitch, cell) {
    const existingIndex = songData.findIndex(n => n.tick === tick && n.pitch === pitch);

    if (existingIndex > -1) {
        // Remove Note
        songData.splice(existingIndex, 1);
        cell.innerHTML = '';
    } else {
        // Add Note
        songData.push({ tick, pitch, inst: selectedInstrument });
        
        const marker = document.createElement('div');
        marker.className = 'note-marker';
        marker.style.backgroundColor = INSTRUMENT_COLORS[selectedInstrument];
        marker.style.color = INSTRUMENT_COLORS[selectedInstrument]; // For shadow
        cell.appendChild(marker);

        playPreviewSound(selectedInstrument, pitch);
    }
}

/**
 * Audio Preview (Browser Side)
 */
function playPreviewSound(instIndex, pitch) {
    const instName = INSTRUMENTS[instIndex];
    // In a real deployed folder, path would be: noteblock/harp/12.ogg
    // Ensure files exist, or this will 404
    const audio = new Audio(`noteblock/${instName}/${pitch}.ogg`);
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio file missing in dev mode"));
}

/**
 * Playback Logic
 */
function togglePlay() {
    if (isPlaying) pause(); else play();
}

function play() {
    isPlaying = true;
    const speed = parseFloat(document.getElementById('speedInput').value) || 1.0;
    const msPerTick = (1000 / CONFIG.ticksPerSecond) / speed;

    playbackInterval = setInterval(() => {
        if (currentTick >= CONFIG.totalTicks) {
            stop();
            return;
        }

        // Play notes at current tick
        const notes = songData.filter(n => n.tick === currentTick);
        notes.forEach(n => playPreviewSound(n.inst, n.pitch));

        // UI Updates
        progressBar.value = (currentTick / CONFIG.totalTicks) * 100;
        updateTimeDisplay();
        
        // Auto scroll
        if(currentTick % 20 === 0) {
            const cellWidth = 30;
            document.querySelector('.grid-scroll-area').scrollLeft = (currentTick * cellWidth) - 100;
        }

        currentTick++;

    }, msPerTick);
}

function pause() {
    isPlaying = false;
    clearInterval(playbackInterval);
}

function stop() {
    pause();
    currentTick = 0;
    progressBar.value = 0;
    updateTimeDisplay();
}

/**
 * Utils
 */
function updateTimeDisplay() {
    const curSec = Math.floor(currentTick / 20);
    const totSec = Math.floor(CONFIG.totalTicks / 20);
    currentTimeEl.textContent = `${Math.floor(curSec/60)}:${(curSec%60).toString().padStart(2,'0')}`;
    totalTimeEl.textContent = `${Math.floor(totSec/60)}:${(totSec%60).toString().padStart(2,'0')}`;
}

function setupListeners() {
    document.getElementById('playBtn').addEventListener('click', play);
    document.getElementById('pauseBtn').addEventListener('click', pause);
    document.getElementById('stopBtn').addEventListener('click', stop);
    document.getElementById('instrumentSelect').addEventListener('change', (e) => selectedInstrument = parseInt(e.target.value));
    
    document.getElementById('progressBar').addEventListener('input', (e) => {
        currentTick = Math.floor((e.target.value / 100) * CONFIG.totalTicks);
        updateTimeDisplay();
    });

    document.getElementById('downloadBtn').addEventListener('click', generateApiFile);
}

/**
 * =========================================================
 *  API GENERATOR (Generates music<number>.js)
 * =========================================================
 */
function generateApiFile() {
    const fileId = Math.floor(Math.random() * 900) + 100; // Random ID (100-999)
    const filename = `music${fileId}.js`;
    const speed = document.getElementById('speedInput').value;

    // Sort data by tick for optimization
    songData.sort((a, b) => a.tick - b.tick);

    // Convert internal object format to Compact API Array Format
    // Format: [tick, instrumentIndex, pitchIndex]
    // Example: [0, 0, 12] -> Tick 0, Harp, Pitch 12
    const dataString = songData.map(n => `[${n.tick},${n.inst},${n.pitch}]`).join(',');

    const fileContent = `/**
 * Bedrock Music API - Track ${fileId}
 * Generated via Web Composer
 */

export const Music${fileId} = {
    id: ${fileId},
    speed: ${speed},
    instruments: ["note.harp", "note.bass", "note.guitar", "note.banjo", "note.pling"],
    
    // Data Format: [tick, instrument_index, pitch_index(0-24)]
    data: [${dataString}],

    /**
     * Helper to get playable data for a specific tick
     * @param {number} currentTick
     */
    getNotesAt(currentTick) {
        return this.data.filter(n => n[0] === currentTick).map(n => {
            return {
                sound: this.instruments[n[1]],
                pitch: Math.pow(2, (n[2] - 12) / 12) // Convert index to Bedrock float pitch
            };
        });
    }
};`;

    download(filename, fileContent);
}

function download(filename, text) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/javascript;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// Run
init();
