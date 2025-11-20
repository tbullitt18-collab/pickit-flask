import os
from dotenv import load_dotenv

# Load .env file FIRST
load_dotenv()

from flask import Flask, request, jsonify, render_template
import uuid
from datetime import datetime
from yelp_client import get_candidates_from_yelp_ai

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

sessions = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/s/<session_id>')
def session_page(session_id):
    return render_template('index.html')

@app.route('/api/health')
def health():
    return jsonify({'status': 'healthy', 'service': 'pickit'})

@app.route('/api/create', methods=['POST'])
def create_session():
    data = request.json
    prefs = data.get('preferences', '')
    location = data.get('location', 'San Francisco, CA')
    user_name = data.get('user_name', 'Anonymous')
    
    try:
        candidates = get_candidates_from_yelp_ai(prefs, location)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    session_id = str(uuid.uuid4())[:8]
    sessions[session_id] = {
        'creator': user_name,
        'preferences': prefs,
        'location': location,
        'candidates': candidates,
        'votes': {},
        'status': 'open',
        'winner': None,
        'created_at': datetime.now().isoformat()
    }
    
    return jsonify({
        'session_id': session_id,
        'candidates': candidates,
        'share_url': f'/s/{session_id}'
    })

@app.route('/api/session/<session_id>', methods=['GET'])
def get_session(session_id):
    session = sessions.get(session_id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    return jsonify(session)

@app.route('/api/vote/<session_id>', methods=['POST'])
def vote(session_id):
    session = sessions.get(session_id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    
    data = request.json
    user_id = data.get('user_id')
    business_id = data.get('business_id')
    vote_value = data.get('vote')
    
    # Store vote
    session['votes'][user_id] = {
        'business_id': business_id,
        'vote': vote_value
    }
    
    # Count votes for each business
    vote_counts = {}
    for voter_id, vote_data in session['votes'].items():
        if vote_data['vote']:  # Only count "yes" votes
            bid = vote_data['business_id']
            vote_counts[bid] = vote_counts.get(bid, 0) + 1
    
    # Check for majority (more than half of voters)
    num_voters = len(session['votes'])
    
    for bid, count in vote_counts.items():
        if count > (num_voters / 2):
            # Find the full candidate data
            winner = next((c for c in session['candidates'] if c['id'] == bid), None)
            
            session['winner'] = winner
            session['status'] = 'closed'
            
            return jsonify({
                'winner': winner,
                'total_votes': num_voters
            })
    
    return jsonify({
        'total_votes': num_voters,
        'winner': None
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
