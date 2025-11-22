let sessionId = null;
let pollInterval = null;
let isHost = false;
let isOnline = true;

// Check connection status
function checkConnection() {
    const wasOnline = isOnline;
    isOnline = navigator.onLine;
    
    if (!isOnline && wasOnline) {
        showConnectionError('Lost internet connection. Reconnecting...');
    } else if (isOnline && !wasOnline) {
        hideConnectionError();
    }
}

// Show connection error banner
function showConnectionError(message) {
    let banner = document.getElementById('connection-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'connection-banner';
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ff6b6b;
            color: white;
            padding: 15px;
            text-align: center;
            font-weight: 600;
            z-index: 10000;
            animation: slideDown 0.3s;
        `;
        document.body.prepend(banner);
    }
    banner.textContent = message;
    banner.style.display = 'block';
}

// Hide connection error banner
function hideConnectionError() {
    const banner = document.getElementById('connection-banner');
    if (banner) {
        banner.style.display = 'none';
    }
}

// Show error message
function showError(message, isRetryable = false) {
    hideAllSections();
    
    let errorSection = document.getElementById('error-section');
    if (!errorSection) {
        errorSection = document.createElement('div');
        errorSection.id = 'error-section';
        errorSection.className = 'error-display';
        document.querySelector('.container').appendChild(errorSection);
    }
    
    errorSection.innerHTML = `
        <div class="error-content">
            <div class="error-icon">⚠️</div>
            <h2>Oops! Something went wrong</h2>
            <p class="error-message">${message}</p>
            ${isRetryable ? '<button onclick="retryLastAction()">🔄 Try Again</button>' : ''}
            <button onclick="startNewDecision()" style="background: white; color: #667eea; margin-top: 10px;">Start Over</button>
        </div>
    `;
    
    errorSection.style.display = 'block';
}

// Retry last action
function retryLastAction() {
    if (lastAction === 'startVoting') {
        startVoting();
    } else {
        location.reload();
    }
}

let lastAction = null;

// Monitor connection
window.addEventListener('online', () => checkConnection());
window.addEventListener('offline', () => checkConnection());
setInterval(checkConnection, 5000);

// Confetti effect
function createConfetti() {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#ffd700', '#ff6b6b'];
    const confettiCount = 100;
    
    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.width = '10px';
            confetti.style.height = '10px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = '-10px';
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            confetti.style.opacity = '1';
            confetti.style.zIndex = '9999';
            confetti.style.pointerEvents = 'none';
            
            const animation = confetti.animate([
                { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
                { transform: `translateY(${window.innerHeight + 20}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
            ], {
                duration: 3000 + Math.random() * 2000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });
            
            document.body.appendChild(confetti);
            animation.onfinish = () => confetti.remove();
        }, i * 20);
    }
}

// Hide all sections
function hideAllSections() {
    document.getElementById('create-section').style.display = 'none';
    const joinSection = document.getElementById('join-section');
    if (joinSection) joinSection.style.display = 'none';
    document.getElementById('session-info').style.display = 'none';
    document.getElementById('preference-header').style.display = 'none';
    document.getElementById('preference-section').style.display = 'none';
    document.getElementById('waiting-section').style.display = 'none';
    document.getElementById('loading-section').style.display = 'none';
    document.getElementById('voting-section').style.display = 'none';
    document.getElementById('waiting-votes-section').style.display = 'none';
    document.getElementById('winner-section').style.display = 'none';
    const errorSection = document.getElementById('error-section');
    if (errorSection) errorSection.style.display = 'none';
}

// Create session
async function createSession() {
    const hostName = document.getElementById('host-name').value.trim();
    const location = document.getElementById('location').value.trim();
    
    if (!hostName || !location) {
        alert('Please enter your name and location');
        return;
    }
    
    try {
        const response = await fetch('/api/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host_name: hostName, location })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create session');
        }
        
        sessionId = data.session_id;
        isHost = true;
        
        hideAllSections();
        document.getElementById('session-info').style.display = 'block';
        document.getElementById('preference-header').style.display = 'block';
        document.getElementById('preference-section').style.display = 'block';
        document.getElementById('session-code-display').textContent = sessionId;
        document.getElementById('share-link').value = `${window.location.origin}/s/${sessionId}`;
        
        startPolling();
    } catch (error) {
        showError(`Failed to create session: ${error.message}`, true);
    }
}

// Join session (show name input first)
async function joinSession(code) {
    sessionId = code;
    isHost = false;
    
    // Check if session exists
    try {
        const response = await fetch(`/api/session/${sessionId}`);
        if (!response.ok) {
            showError('Session not found. Please check your link and try again.', false);
            return;
        }
    } catch (error) {
        showError('Unable to connect. Please check your internet connection.', true);
        return;
    }
    
    hideAllSections();
    document.getElementById('join-section').style.display = 'block';
}

// Confirm join after entering name
function confirmJoin() {
    const name = document.getElementById('participant-name').value.trim();
    
    if (!name) {
        alert('Please enter your name');
        return;
    }
    
    hideAllSections();
    document.getElementById('preference-header').style.display = 'block';
    document.getElementById('preference-section').style.display = 'block';
    
    startPolling();
}

// Submit preference
async function submitPreference() {
    const preference = document.getElementById('preference-input').value.trim();
    
    if (!preference) {
        alert('Please enter your preference');
        return;
    }
    
    try {
        const participantName = document.getElementById('participant-name')?.value || 
                               document.getElementById('host-name')?.value || 
                               'Anonymous';
        
        const response = await fetch(`/api/submit-preference/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                preference,
                participant_name: participantName
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to submit preference');
        }
        
        // Clear input
        document.getElementById('preference-input').value = '';
        
        // Show confirmation
        alert(`Preference submitted: "${preference}"`);
        
        // Only hide for non-hosts
        if (!isHost) {
            document.getElementById('preference-input').disabled = true;
            document.querySelector('#preference-section button').disabled = true;
            hideAllSections();
            document.getElementById('waiting-section').style.display = 'block';
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// Remove preference
async function removePreference(index) {
    if (!confirm('Remove this preference?')) return;
    
    try {
        const response = await fetch(`/api/remove-preference/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to remove preference');
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// Reset session
async function resetSession() {
    if (!confirm('Reset this session? All preferences and votes will be cleared.')) return;
    
    try {
        const response = await fetch(`/api/reset-session/${sessionId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to reset session');
        }
        
        alert('Session reset! Start fresh.');
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// Start voting
async function startVoting() {
    lastAction = 'startVoting';
    
    try {
        hideAllSections();
        document.getElementById('loading-section').style.display = 'block';
        
        const response = await fetch(`/api/start-voting/${sessionId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            if (data.error_type === 'no_results') {
                showError(data.error, true);
            } else if (data.error_type === 'api_auth' || data.error_type === 'network') {
                showError(data.error, true);
            } else {
                showError(data.error || 'Failed to start voting', true);
            }
        }
    } catch (error) {
        showError('Unable to connect to server. Please check your connection and try again.', true);
    }
}

// Vote for candidate
async function vote(candidateId) {
    try {
        const response = await fetch(`/api/vote/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidate_id: candidateId })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to vote');
        }
    } catch (error) {
        alert(`Error voting: ${error.message}`);
    }
}

// Update UI based on session state
function updateUI(session) {
    console.log('Session status:', session.status, 'Preferences:', session.preferences?.length, 'isHost:', isHost);
    
    if (session.status === 'collecting' && isHost) {
        document.getElementById('session-info').style.display = 'block';
        document.getElementById('preference-header').style.display = 'block';
        document.getElementById('preference-section').style.display = 'block';
        
        if (session.preferences && session.preferences.length > 0) {
            const list = document.getElementById('preferences-list');
            list.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin: 20px 0 10px 0;">
                    <h3 style="color: #333; margin: 0;">Submitted Preferences (${session.participants?.length || 0} participants)</h3>
                    <button onclick="resetSession()" style="padding: 8px 16px; font-size: 14px; background: #ff6b6b;">🔄 Reset</button>
                </div>` + 
                session.preferences
                    .map((p, i) => `
                        <div class="preference-item">
                            <span>✓ ${p}</span>
                            <button onclick="removePreference(${i})" style="padding: 5px 12px; font-size: 12px; background: #ff6b6b;">Remove</button>
                        </div>
                    `)
                    .join('');
            
            const startBtn = document.getElementById('start-voting-btn');
            startBtn.style.display = 'block';
            startBtn.style.visibility = 'visible';
            startBtn.disabled = false;
            startBtn.textContent = `🎲 Start Voting (${session.preferences.length} preferences)`;
        }
    } else if (session.status === 'voting') {
        if (session.candidates && session.candidates.length > 0) {
            hideAllSections();
            document.getElementById('voting-section').style.display = 'block';
            renderCards(session.candidates, session.votes || {});
        }
    } else if (session.status === 'completed' && session.winner) {
        hideAllSections();
        document.getElementById('winner-section').style.display = 'block';
        displayWinner(session.winner);
        createConfetti();
    } else if (session.status === 'timeout') {
        showError('This session has expired. Start a new one to continue.', false);
    }
}

// Create vote progress info element
function createProgressInfo() {
    const info = document.createElement('div');
    info.id = 'vote-progress-info';
    info.style.cssText = 'text-align: center; margin-bottom: 20px; font-size: 1.2em; font-weight: 600; color: #667eea;';
    const votingSection = document.getElementById('voting-section');
    const container = votingSection.querySelector('.cards-container');
    if (container) {
        votingSection.insertBefore(info, container);
    }
    return info;
}

// Render restaurant cards with vote counts
function renderCards(candidates, votes = {}) {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';
    
    const voteCounts = {};
    Object.values(votes).forEach(candidateId => {
        voteCounts[candidateId] = (voteCounts[candidateId] || 0) + 1;
    });
    
    const totalVotes = Object.keys(votes).length;
    const maxVotes = Math.max(...Object.values(voteCounts), 0);
    
    candidates.forEach((candidate) => {
        const card = document.createElement('div');
        const voteCount = voteCounts[candidate.id] || 0;
        const isLeading = voteCount > 0 && voteCount === maxVotes && totalVotes > 1;
        
        card.className = 'restaurant-card';
        if (isLeading) card.classList.add('leading');
        
        card.onclick = () => {
            document.querySelectorAll('.restaurant-card').forEach(c => c.classList.remove('voted'));
            card.classList.add('voted');
            card.style.animation = 'pulse 0.3s';
            setTimeout(() => card.style.animation = '', 300);
            vote(candidate.id);
        };
        
        const categoryText = candidate.categories && candidate.categories.length > 0 
            ? candidate.categories.join(', ')
            : 'Restaurant';
        
        const votePercentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
        
        card.innerHTML = `
            <div class="vote-badge">✓ Your Vote</div>
            ${voteCount > 0 ? `<div class="vote-count">${voteCount} vote${voteCount !== 1 ? 's' : ''}</div>` : ''}
            ${isLeading ? '<div class="leading-badge">🔥 Leading</div>' : ''}
            <img src="${candidate.image_url || 'https://via.placeholder.com/400x200?text=Restaurant'}" 
                 alt="${candidate.name}" 
                 class="card-image"
                 onerror="this.src='https://via.placeholder.com/400x200?text=Restaurant'">
            <div class="card-content">
                <div class="card-header">
                    <h3 class="card-title">${candidate.name}</h3>
                    <div class="card-rating">
                        ⭐ ${candidate.rating || 'N/A'}
                    </div>
                </div>
                <div class="card-categories">${categoryText}</div>
                <span class="card-price">${candidate.price || '$$'}</span>
                <div class="card-address">📍 ${candidate.address || 'Address not available'}</div>
                ${voteCount > 0 ? `
                    <div class="vote-progress">
                        <div class="vote-progress-bar" style="width: ${votePercentage}%"></div>
                    </div>
                ` : ''}
            </div>
        `;
        
        container.appendChild(card);
    });
    
    if (totalVotes > 0) {
        const progressDiv = document.getElementById('vote-progress-info') || createProgressInfo();
        progressDiv.textContent = `📊 ${totalVotes} vote${totalVotes !== 1 ? 's' : ''} cast`;
    }
}

// Display winner
function displayWinner(winner) {
    document.getElementById('winner-name').textContent = winner.name;
    document.getElementById('winner-address').textContent = winner.address || 'Address not available';
    document.getElementById('winner-phone').textContent = winner.phone || 'Phone not available';
    
    if (winner.image_url) {
        document.getElementById('winner-image').src = winner.image_url;
        document.getElementById('winner-image').style.display = 'block';
    }
    
    if (winner.url) {
        const yelpBtn = document.getElementById('view-yelp-btn');
        yelpBtn.href = winner.url;
        yelpBtn.style.display = 'inline-block';
    }
}

// Poll for updates
function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    
    pollInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/session/${sessionId}`);
            if (!response.ok) throw new Error('Session fetch failed');
            const session = await response.json();
            updateUI(session);
        } catch (error) {
            console.error('Polling error:', error);
            if (!navigator.onLine) {
                showConnectionError('Lost connection. Retrying...');
            }
        }
    }, 2000);
}

// Copy link
function copyLink() {
    const input = document.getElementById('share-link');
    input.select();
    document.execCommand('copy');
    
    const btn = document.querySelector('button[onclick="copyLink()"]');
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = originalText, 2000);
}

// Start new decision
function startNewDecision() {
    if (pollInterval) clearInterval(pollInterval);
    sessionId = null;
    isHost = false;
    window.location.href = '/';
}

// Check if joining via link
window.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.startsWith('/s/')) {
        const code = path.split('/s/')[1];
        joinSession(code);
    }
});
