const welcomeContainer = document.getElementById('welcome-container');
const gameContainer = document.getElementById('game-container');
const startGameBtn = document.getElementById('start-game');
const pointsSpan = document.getElementById('points');
const voiceButton = document.getElementById('voice-button');
const transcriptSpan = document.getElementById('transcript');
const treeImg = document.getElementById('tree');
const stageVideo = document.getElementById('stage-video');
const muteButton = document.getElementById('mute-button');
const backgroundAudio = document.getElementById('background-audio');

// WARNING: It is not secure to hardcode an API key in a real application.
const API_KEY = 'AIzaSyCmO2zV5M4_MsFIUsqKBYIqVoytW-Hf_0o';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

let points = 0;

const stages = [
    { points: 50, video: 'assets/stage1.mp4' },
    { points: 100, video: 'assets/stage2.mp4' },
    { points: 150, video: 'assets/stage3.mp4' },
    { points: 200, video: 'assets/stage4.mp4' },
];

startGameBtn.addEventListener('click', () => {
    welcomeContainer.style.display = 'none';
    gameContainer.style.display = 'block';

    if (backgroundAudio) {
        backgroundAudio.play().catch(error => console.error("Audio play failed:", error));
    }
});

muteButton.addEventListener('click', () => {
    if (backgroundAudio) {
        backgroundAudio.muted = !backgroundAudio.muted;
        muteButton.textContent = backgroundAudio.muted ? '🔇' : '🔊';
    }
});

async function getImpactFromAI(text) {
    console.log('Sending to AI:', text);
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are an environmental impact analyst for a game. Your task is to score a user\'s described action based on its positive environmental impact on a scale of 0 to 50. Use the following rubric:\n- A small action (e.g., recycling a bottle, turning off a light) is 5-10 points.\n- A medium action (e.g., taking public transport, using reusable bags) is 15-25 points.\n- A large action (e.g., planting a tree, organizing a cleanup) is 30-45 points.\n- An exceptionally large action (e.g., organizing a large-scale planting event) can be 50 points.\n- No impact or a negative impact is 0 points.\n\nAnalyze the user\'s statement and respond with only the numerical score. Do not add any other words.\n\nUser statement: '${text}'`
                    }]
                }]
            })
        });

        if (!response.ok) {
            console.error('API request failed with status:', response.status);
            const errorBody = await response.text();
            console.error('Error body:', errorBody);
            throw new Error('API request failed');
        }

        const data = await response.json();
        console.log('Full AI Response:', JSON.stringify(data, null, 2));

        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
            console.error('Invalid AI response structure:', data);
            if (data.promptFeedback) {
                console.error('Prompt feedback:', data.promptFeedback);
            }
            return 0;
        }

        const scoreText = data.candidates[0].content.parts[0].text;
        const match = scoreText.match(/\d+/);
        const score = match ? parseInt(match[0], 10) : 0;

        return score;
    } catch (error) {
        console.error('Error calling AI API:', error);
        return 0;
    }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    voiceButton.addEventListener('click', () => {
        if (voiceButton.textContent === 'Speak') {
            recognition.start();
            voiceButton.textContent = 'Listening...';
        } else {
            recognition.stop();
            voiceButton.textContent = 'Speak';
        }
    });

    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        transcriptSpan.textContent = `You said: "${transcript}"`;

        voiceButton.textContent = 'Thinking...';
        voiceButton.disabled = true;
        const awardedPoints = await getImpactFromAI(transcript);
        voiceButton.textContent = 'Speak';
        voiceButton.disabled = false;

        if (awardedPoints > 0) {
            points += awardedPoints;
            pointsSpan.textContent = points;
            transcriptSpan.textContent += `\nAI awarded ${awardedPoints} points!`;

            const currentStage = stages.slice().reverse().find(stage => points >= stage.points);
            if (currentStage) {
                treeImg.style.display = 'none';
                stageVideo.style.display = 'block';
                const videoUrl = new URL(currentStage.video, window.location.href).href;
                if (stageVideo.src !== videoUrl) {
                    stageVideo.src = currentStage.video;
                }
            }
        } else {
            transcriptSpan.textContent += '\nAI detected no significant environmental impact.';
        }
    };

    recognition.onend = () => {
        if (voiceButton.textContent === 'Listening...') {
            voiceButton.textContent = 'Speak';
        }
    };

} else {
    voiceButton.disabled = true;
    voiceButton.textContent = 'Voice input not supported';
    transcriptSpan.textContent = 'Your browser does not support the Web Speech API.';
}

stageVideo.addEventListener('ended', () => {
    stageVideo.pause();
});