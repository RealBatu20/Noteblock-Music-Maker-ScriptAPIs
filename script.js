// Configuration
const TICKS_PER_SECOND = 20; // Minecraft runs at 20 ticks/sec
const NOTES_COUNT = 25; // 2 Octaves (0 - 24)
const TOTAL_TICKS = 200; // Length of the song in ticks (10 seconds default)

// State
let songData = []; // Array of { tick, pitch, instrument }
let isPlaying = false;
let currentTick = 0;
let playbackInterval = null;
let speed = 1.0;
let currentInstrument = 'harp';

// DOM Elements
const sequencer = document.getElementById('sequencer');
const progressBar = document.getElementById('progressBar');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const speedInput = document.getElementById('speedInput');

// Init
function init() {
    renderGrid();
    setupEventListeners();
    updateTimeDisplay();
}

// 1. Render the Sequencer Grid
function renderGrid() {
    sequencer.style.gridTemplateColumns = `repeat(${TOTAL_TICKS}, 30px)`;
    sequencer.innerHTML = '';

    for (let pitch = 24; pitch >= 0; pitch--) {
        for (let tick = 0; tick < TOTAL_TICKS; tick++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.tick = tick;
            cell.dataset.pitch = pitch;
            
            // Toggle Note on Click
            cell.addEventListener('click', () => toggleNote(tick, pitch, cell));
            sequencer.appendChild(cell);
        }
    }
}

// 2. Logic: Toggle Note
function toggleNote(tick, pitch, cell) {
    const existingIndex = songData.findIndex(n => n.tick === tick && n.pitch === pitch);
    
    if (existingIndex > -1) {
        // Remove Note
        songData.splice(existingIndex, 1);
        cell.innerHTML = '';
    } else {
        // Add Note
        songData.push({ tick, pitch, instrument: currentInstrument });
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note-block';
        
        // Color code based on instrument
        if(currentInstrument === 'bass') noteDiv.style.backgroundColor = '#d35400';
        if(currentInstrument === 'pling') noteDiv.style.backgroundColor = '#8e44ad';
        
        cell.appendChild(noteDiv);
        playPreviewSound(currentInstrument, pitch);
    }
}

// 3. Audio: Play Sound in Browser
function playPreviewSound(instrument, pitchIndex) {
    // Minecraft pitch math: 2^((pitchIndex - 12) / 12)
    // Assuming you have files 0.ogg to 24.ogg or similar logic. 
    // Here we assume mapping specific folders.
    
    // In a real scenario, use new Audio(`noteblock/${instrument}/${pitchIndex}.ogg`).play();
    // Since we don't have files, we log:
    console.log(`🎵 Playing: ${instrument} at pitch index ${pitchIndex}`);
}

// 4. Playback Logic
function play() {
    if (isPlaying) return;
    isPlaying = true;
    const tickRate = (1000 / TICKS_PER_SECOND) / speed;

    playbackInterval = setInterval(() => {
        if (currentTick >= TOTAL_TICKS) {
            if (document.getElementById('repeatCheckbox').checked) {
                currentTick = 0;
            } else {
                stop();
                return;
            }
        }

        // Find notes at current tick
        const notes = songData.filter(n => n.tick === currentTick);
        notes.forEach(n => playPreviewSound(n.instrument, n.pitch));

        // Update UI
        progressBar.value = (currentTick / TOTAL_TICKS) * 100;
        updateTimeDisplay();

        currentTick++;
    }, tickRate);
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

function updateTimeDisplay() {
    const curSec = Math.floor(currentTick / 20);
    const totSec = Math.floor(TOTAL_TICKS / 20);
    currentTimeEl.textContent = formatTime(curSec);
    totalTimeEl.textContent = formatTime(totSec);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// 5. Event Listeners
function setupEventListeners() {
    document.getElementById('playBtn').addEventListener('click', play);
    document.getElementById('pauseBtn').addEventListener('click', pause);
    document.getElementById('stopBtn').addEventListener('click', stop);
    
    document.getElementById('instrumentSelect').addEventListener('change', (e) => {
        currentInstrument = e.target.value;
    });

    speedInput.addEventListener('change', (e) => {
        speed = parseFloat(e.target.value);
        if(isPlaying) { pause(); play(); } // Restart to apply speed
    });

    progressBar.addEventListener('input', (e) => {
        currentTick = Math.floor((e.target.value / 100) * TOTAL_TICKS);
        updateTimeDisplay();
    });

    document.getElementById('downloadBtn').addEventListener('click', generateBedrockScript);
}

// =======================================================
// 6. GENERATE MINECRAFT BEDROCK SCRIPT (The Core Req)
// =======================================================
function generateBedrockScript() {
    const fileId = Math.floor(Math.random() * 1000) + 1;
    const fileName = `music${fileId}.js`;

    // Map instruments to Minecraft Sound IDs
    const mcInstruments = {
        'harp': 'note.harp',
        'bass': 'note.bass',
        'guitar': 'note.guitar',
        'banjo': 'note.banjo',
        'pling': 'note.pling'
    };

    // Calculate Minecraft Pitch (0.5 to 2.0 range) based on 0-24 index
    // F#3 is roughly 0.5, F#5 is 2.0. Center is F#4 (index 12) = 1.0
    const notesCode = songData.map(note => {
        const mcPitch = Math.pow(2, (note.pitch - 12) / 12);
        return `{ tick: ${note.tick}, sound: "${mcInstruments[note.instrument]}", pitch: ${mcPitch.toFixed(2)} }`;
    }).join(',\n    ');

    const scriptContent = `
/**
 * ${fileName}
 * Generated by AI Web Composer
 * 
 * INSTRUCTIONS:
 * 1. Place this file in your behavior pack scripts folder.
 * 2. In game, run: /scriptevent music:play ${fileId}
 */

import { world, system } from "@minecraft/server";

const songData = [
    ${notesCode}
];

const SONG_ID = ${fileId};
const TOTAL_TICKS = ${TOTAL_TICKS};

// Listen for the slash command
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id === "music:play" && event.message === "${fileId}") {
        const player = event.sourceEntity;
        if (!player) return;
        
        world.sendMessage(\`§aPlaying music track ${fileId}...\`);
        playSong(player);
    }
});

function playSong(entity) {
    let currentTick = 0;
    
    const runId = system.runInterval(() => {
        if (currentTick >= TOTAL_TICKS) {
            system.clearRun(runId);
            world.sendMessage("§eMusic finished.");
            return;
        }

        // Find notes for this tick
        const notes = songData.filter(n => n.tick === currentTick);
        
        for (const note of notes) {
            entity.dimension.playSound(note.sound, entity.location, {
                pitch: note.pitch,
                volume: 1.0
            });
        }

        currentTick++;
    }, 1); // Run every tick
}
`;

    downloadFile(fileName, scriptContent);
}

function downloadFile(name, content) {
    const blob = new Blob([content], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Start
init();
