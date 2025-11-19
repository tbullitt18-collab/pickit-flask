let currentSession = null;
let currentUserId = localStorage.getItem('userId') || generateUserId();
let currentUserName = '';

function generateUserId() {
    const id = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userId', id);
    return id;
}

// Create session
document.getElementById('create-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userName = document.getElementById('user-name').value;
    const preferences = document.getElementById('preferences').value;
    const location = document.getElementById('location').value;
    
    currentUserName = userName;
    showScreen('loading-screen');
    
    try {
        const response = await fetch('/api/create', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                user_name: userName,
                preferences,
                location
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentSession = data;
            displayCandidates(data.candidates, data.session_id);
            setupShareLink(data.session_id);
            showScreen('candidates-screen');
        } else {
            alert('Error: ' + data.error);
            showScreen('create-screen');
        }
    } catch (error) {
        alert('Network error: ' + error.message);
        showScreen('create-screen');
    }
});

function displayCandidates(candidates, sessionId) {
    const list = document.getElementById('candidates-list');
    list.innerHTML = '';
    
    candidates.forEach(candidate => {
        const card = document.createElement('div');
        card.className = 'candidate-card';
        card.id = `candidate-${candidate.id}`;
        
        card.innerHTML = `
            <div class="candidate-header">
                <div class="candidate-name">${candidate.name}</div>
                <div class="candidate-rating">⭐ ${candidate.rating}</div>
            </div>
            <div class="candidate-details">
                <div><strong>${candidate.price || '$$'}</strong> • ${candidate.categories.join(', ')}</div>
                <div>${candidate.address}</div>
                <div style="margin-top:8px">${candidate.snippet}</div>
            </div>
            <div class="vote-buttons">
                <button class="vote-btn vote-yes" onclick="vote('${sessionId}', '${candidate.id}', true)">
                    👍 Yes
                </button>
                <button class="vote-btn vote-no" onclick="vote('${sessionId}', '${candidate.id}', false)">
                    👎 Pass
                </button>
            </div>
        `;
        
        list.appendChild(card);
    });
}

async function vote(sessionId, businessId, voteValue) {
    if (!currentUserName) {
        currentUserName = prompt('Enter your name:') || 'Anonymous';
    }
    
    try {
        const response = await fetch(`/api/vote/${sessionId}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                user_id: currentUserId,
                user_name: currentUserName,
                business_id: businessId,
                vote: voteValue
            })
        });
        
        const data = await response.json();
        
        if (data.winner) {
            showWinner(data.winner);
        } else {
            // Mark as voted
            document.getElementById(`candidate-${businessId}`).classList.add('voted');
            updateVoteStatus(data.total_votes);
        }
    } catch (error) {
        alert('Vote error: ' + error.message);
    }
}

function updateVoteStatus(totalVotes) {
    document.getElementById('vote-status').innerHTML = 
        `<strong>${totalVotes}</strong> ${totalVotes === 1 ? 'person has' : 'people have'} voted. Waiting for majority...`;
}

function showWinner(winner) {
    document.getElementById('winner-details').innerHTML = `
        <div class="winner-card">
            <div class="winner-name">${winner.name}</div>
            <div><strong>⭐ ${winner.rating}</strong> • ${winner.price}</div>
            <div style="margin:15px 0">${winner.address}</div>
            <div>${winner.categories.join(' • ')}</div>
            <div style="margin-top:20px">
                <a href="${winner.url}" target="_blank" class="btn-primary" style="display:inline-block;text-decoration:none">
                    View on Yelp
                </a>
            </div>
        </div>
    `;
    showScreen('winner-screen');
}

async function loadSession(sessionId) {
    showScreen('loading-screen');
    
    if (!currentUserName) {
        currentUserName = prompt('Enter your name to join:') || 'Anonymous';
    }
    
    try {
        const response = await fetch(`/api/session/${sessionId}`);
        const session = await response.json();
        
        if (session.status === 'closed' && session.winner) {
            showWinner(session.winner);
        } else {
            displayCandidates(session.candidates, sessionId);
            setupShareLink(sessionId);
            showScreen('candidates-screen');
            
            // Poll for updates
            startPolling(sessionId);
        }
    } catch (error) {
        alert('Session not found');
        showScreen('create-screen');
    }
}

function startPolling(sessionId) {
    setInterval(async () => {
        try {
            const response = await fetch(`/api/session/${sessionId}`);
            const session = await response.json();
            
            if (session.status === 'closed' && session.winner) {
                showWinner(session.winner);
            } else {
                updateVoteStatus(Object.keys(session.votes).length);
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 3000);
}

function setupShareLink(sessionId) {
    const shareUrl = `${window.location.origin}/s/${sessionId}`;
    document.getElementById('share-link').value = shareUrl;
}

function copyLink() {
    const input = document.getElementById('share-link');
    input.select();
    document.execCommand('copy');
    alert('Link copied! Share with your group.');
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}
