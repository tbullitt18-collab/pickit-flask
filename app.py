import os
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify, render_template
import uuid
from datetime import datetime, timedelta
from yelp_client import get_candidates_from_yelp_ai
import random

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

sessions = {}

@app.route('/')
def landing():
    return render_template('landing.html')

@app.route('/app')
def index():
    return render_template('app.html')

@app.route('/s/<session_id>')
def session_page(session_id):
    return render_template('app.html')

@app.route('/api/health')
def health():
    return jsonify({'status': 'healthy', 'service': 'pickit'})

@app.route('/api/create', methods=['POST'])
def create_session():
    try:
        data = request.json
        location = data.get('location', '').strip()
        host_name = data.get('host_name', '').strip()
        
        if not location:
            return jsonify({'error': 'Location is required'}), 400
        if not host_name:
            return jsonify({'error': 'Name is required'}), 400
        
        timeout_minutes = data.get('timeout', 15)
        
        session_id = str(uuid.uuid4())[:8]
        sessions[session_id] = {
            'creator': host_name,
            'location': location,
            'preferences': [],
            'participants': [],
            'candidates': [],
            'votes': {},
            'status': 'collecting',
            'started': False,
            'winner': None,
            'tie_breaker': False,
            'error': None,
            'timeout_at': (datetime.now() + timedelta(minutes=timeout_minutes)).isoformat(),
            'created_at': datetime.now().isoformat()
        }
        
        return jsonify({
            'session_id': session_id,
            'share_url': f'/s/{session_id}',
            'timeout_minutes': timeout_minutes
        })
    except Exception as e:
        return jsonify({'error': f'Failed to create session: {str(e)}'}), 500

@app.route('/api/submit-preference/<session_id>', methods=['POST'])
def submit_preference(session_id):
    try:
        session = sessions.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found. Please check the link and try again.'}), 404
        
        if session['status'] != 'collecting':
            return jsonify({'error': 'This session is no longer accepting preferences.'}), 400
        
        data = request.json
        preference = data.get('preference', '').strip()
        participant_name = data.get('participant_name', 'Anonymous')
        
        if not preference:
            return jsonify({'error': 'Please enter a preference'}), 400
        
        if len(preference) > 500:
            return jsonify({'error': 'Preference is too long (max 500 characters)'}), 400
        
        if not isinstance(session['preferences'], list):
            session['preferences'] = []
        
        session['preferences'].append(preference)
        
        if participant_name not in session['participants']:
            session['participants'].append(participant_name)
        
        return jsonify({
            'message': 'Preference submitted',
            'total_submitted': len(session['preferences']),
            'participant_count': len(session['participants'])
        })
    except Exception as e:
        return jsonify({'error': f'Failed to submit preference: {str(e)}'}), 500

@app.route('/api/remove-preference/<session_id>', methods=['POST'])
def remove_preference(session_id):
    try:
        session = sessions.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        if session['status'] != 'collecting':
            return jsonify({'error': 'Cannot remove preferences after voting started'}), 400
        
        data = request.json
        index = data.get('index')
        
        if index is not None and 0 <= index < len(session['preferences']):
            removed = session['preferences'].pop(index)
            return jsonify({
                'message': 'Preference removed',
                'removed': removed,
                'total_remaining': len(session['preferences'])
            })
        
        return jsonify({'error': 'Invalid preference index'}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to remove preference: {str(e)}'}), 500

@app.route('/api/reset-session/<session_id>', methods=['POST'])
def reset_session(session_id):
    try:
        session = sessions.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        session['preferences'] = []
        session['candidates'] = []
        session['votes'] = {}
        session['status'] = 'collecting'
        session['started'] = False
        session['winner'] = None
        session['tie_breaker'] = False
        session['error'] = None
        
        return jsonify({
            'message': 'Session reset',
            'status': session['status']
        })
    except Exception as e:
        return jsonify({'error': f'Failed to reset session: {str(e)}'}), 500

@app.route('/api/start-voting/<session_id>', methods=['POST'])
def start_voting(session_id):
    try:
        session = sessions.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        all_prefs = session['preferences']
        
        if not all_prefs:
            return jsonify({'error': 'No preferences submitted. Add at least one preference to start voting.'}), 400
        
        combined = ', '.join(all_prefs)
        
        try:
            candidates = get_candidates_from_yelp_ai(combined, session['location'])
            
            if not candidates or len(candidates) == 0:
                session['error'] = 'no_results'
                return jsonify({
                    'error': f'No restaurants found matching your preferences in {session["location"]}. Try different preferences or location.',
                    'error_type': 'no_results'
                }), 404
            
            session['candidates'] = candidates
            session['status'] = 'voting'
            session['started'] = True
            session['error'] = None
            
            return jsonify({
                'message': 'Voting started',
                'candidates': candidates,
                'combined_preferences': combined
            })
        except Exception as yelp_error:
            session['error'] = 'api_error'
            error_msg = str(yelp_error)
            
            if 'API key' in error_msg or 'authentication' in error_msg.lower():
                return jsonify({
                    'error': 'Restaurant search service is temporarily unavailable. Please try again later.',
                    'error_type': 'api_auth'
                }), 503
            elif 'network' in error_msg.lower() or 'connection' in error_msg.lower():
                return jsonify({
                    'error': 'Network connection error. Please check your internet and try again.',
                    'error_type': 'network'
                }), 503
            else:
                return jsonify({
                    'error': f'Failed to find restaurants: {error_msg}',
                    'error_type': 'api_error'
                }), 500
                
    except Exception as e:
        return jsonify({'error': f'Failed to start voting: {str(e)}'}), 500

@app.route('/api/regenerate/<session_id>', methods=['POST'])
def regenerate_candidates(session_id):
    try:
        session = sessions.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        if session['status'] != 'voting':
            return jsonify({'error': 'Not in voting phase'}), 400
        
        all_prefs = session['preferences']
        combined = ', '.join(all_prefs)
        
        try:
            candidates = get_candidates_from_yelp_ai(combined, session['location'])
            
            if not candidates or len(candidates) == 0:
                return jsonify({
                    'error': 'No new restaurants found. Try adjusting your preferences.',
                    'error_type': 'no_results'
                }), 404
            
            session['candidates'] = candidates
            session['votes'] = {}
            session['error'] = None
            
            return jsonify({
                'candidates': candidates,
                'message': 'New options generated'
            })
        except Exception as yelp_error:
            return jsonify({
                'error': f'Failed to regenerate options: {str(yelp_error)}',
                'error_type': 'api_error'
            }), 500
            
    except Exception as e:
        return jsonify({'error': f'Failed to regenerate: {str(e)}'}), 500

@app.route('/api/session/<session_id>', methods=['GET'])
def get_session(session_id):
    try:
        session = sessions.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found or expired'}), 404
        
        if datetime.now() > datetime.fromisoformat(session['timeout_at']):
            if session['status'] != 'completed':
                session['status'] = 'timeout'
        
        return jsonify(session)
    except Exception as e:
        return jsonify({'error': f'Failed to get session: {str(e)}'}), 500

@app.route('/api/vote/<session_id>', methods=['POST'])
def vote(session_id):
    try:
        session = sessions.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        if session['status'] != 'voting':
            return jsonify({'error': 'Voting is not currently active'}), 400
        
        data = request.json
        candidate_id = data.get('candidate_id')
        
        if not candidate_id:
            return jsonify({'error': 'No candidate selected'}), 400
        
        if not any(c['id'] == candidate_id for c in session['candidates']):
            return jsonify({'error': 'Invalid candidate selected'}), 400
        
        voter_id = request.remote_addr + str(datetime.now().timestamp())
        
        session['votes'][voter_id] = candidate_id
        
        vote_counts = {}
        for vid, cid in session['votes'].items():
            vote_counts[cid] = vote_counts.get(cid, 0) + 1
        
        num_preferences = len(session['preferences'])
        votes_cast = len(session['votes'])
        
        for cid, count in vote_counts.items():
            if count > (num_preferences / 2):
                winner = next((c for c in session['candidates'] if c['id'] == cid), None)
                session['winner'] = winner
                session['status'] = 'completed'
                session['tie_breaker'] = False
                
                return jsonify({
                    'winner': winner,
                    'total_votes': votes_cast,
                    'winning_votes': count,
                    'tie_breaker': False
                })
        
        if votes_cast >= num_preferences and vote_counts:
            max_votes = max(vote_counts.values())
            tied = [cid for cid, count in vote_counts.items() if count == max_votes]
            
            winner_id = random.choice(tied)
            winner = next((c for c in session['candidates'] if c['id'] == winner_id), None)
            
            session['winner'] = winner
            session['status'] = 'completed'
            session['tie_breaker'] = len(tied) > 1
            
            return jsonify({
                'winner': winner,
                'total_votes': votes_cast,
                'winning_votes': max_votes,
                'tie_breaker': len(tied) > 1
            })
        
        return jsonify({
            'total_votes': votes_cast,
            'expected_votes': num_preferences,
            'winner': None
        })
    except Exception as e:
        return jsonify({'error': f'Failed to record vote: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
