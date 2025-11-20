import os
from dotenv import load_dotenv

# Load environment variables from .env file
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

@app.route('/api/create', methods=['POST'])
def create_session():
    data = request.json
    prefs = data.get('preferences', '')
    location = data.get('location', 'San Francisco, CA')
    user_name = data.get('user_name', 'Anonymous')
    candidates = get_candidates_from_yelp_ai(prefs, location)
    session_id = str(uuid.uuid4())[:8]
    sessions[session_id] = {
        'creator': user_name,
        'preferences': prefs,
        'location': location,
        'candidates': candidates,
        'votes': {},
        'status': 'open',
        'created_at': datetime.now().isoformat()
    }
    return jsonify({'session_id': session_id, 'candidates': candidates, 'share_url': f'/s/{session_id}'})

@app.route('/api/session/<session_id>', methods=['GET'])
def get_session(session_id):
    session = sessions.get(session_id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    return jsonify(session)

@app.route('/api/vote/<session_id>', methods=['POST'])
def vote(session_id):
    session = sessions.get(session_id)
    if not session or session['status'] != 'open':
        return jsonify({'error': 'Invalid session'}), 400
    data = request.json
    user_id = data.get('user_id')
    business_id = data.get('business_id')
    vote_value = data.get('vote')
    session['votes'][user_id] = {'business_id': business_id, 'vote': bool(vote_value)}
    votes = session['votes']
    counts = {}
    for v in votes.values():
        if not v['vote']:
            continue
        counts[v['business_id']] = counts.get(v['business_id'], 0) + 1
    num_voters = len(set(votes.keys()))
    for cid, ccount in counts.items():
        if ccount > (num_voters / 2):
            session['winner'] = cid
            session['status'] = 'closed'
            return jsonify({'winner': cid, 'closed': True})
    return jsonify({'ok': True, 'votes': votes})

@app.route('/s/<session_id>')
def session_page(session_id):
    return render_template('index.html', session_id=session_id)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)  # Change debug=True to False
