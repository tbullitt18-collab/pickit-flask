import os
import requests
from typing import List, Dict

YELP_API_KEY = os.getenv('YELP_API_KEY')
YELP_AI_ENDPOINT = 'https://api.yelp.com/v3/ai/chat'  # AI API endpoint
YELP_SEARCH_ENDPOINT = 'https://api.yelp.com/v3/businesses/search'  # Fallback

def get_candidates_from_yelp_ai(preferences: str, location: str) -> List[Dict]:
    """
    Query Yelp AI API for restaurant candidates based on natural language prefs
    """
    if not YELP_API_KEY:
        raise ValueError("YELP_API_KEY not set in environment")
    
    headers = {
        'Authorization': f'Bearer {YELP_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    # Construct AI prompt for Yelp
    prompt = f"""Find 6 great restaurant options for a group based on these preferences: {preferences}
    
Location: {location}

Return restaurants with high ratings (3.5+), include variety in cuisine and price range within the preferences. 
For each restaurant provide: name, rating, price level, cuisine type, address, and a one-sentence highlight."""
    
    try:
        # Try Yelp AI API first (conversational endpoint)
        payload = {
            'message': prompt,
            'location': location
        }
        
        response = requests.post(
            YELP_AI_ENDPOINT,
            json=payload,
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            return parse_ai_response(data)
        else:
            # Fallback to traditional search API with smart parsing
            return fallback_search(preferences, location, headers)
            
    except Exception as e:
        print(f"Yelp API error: {e}")
        # Fallback to traditional search
        return fallback_search(preferences, location, headers)

def fallback_search(preferences: str, location: str, headers: Dict) -> List[Dict]:
    """Fallback to Yelp Fusion search API"""
    
    # Extract key terms from preferences
    term = extract_cuisine_term(preferences)
    
    params = {
        'term': term or 'restaurants',
        'location': location,
        'limit': 6,
        'sort_by': 'rating',
        'open_now': True
    }
    
    response = requests.get(
        YELP_SEARCH_ENDPOINT,
        params=params,
        headers=headers,
        timeout=10
    )
    
    if response.status_code != 200:
        raise Exception(f"Yelp API error: {response.status_code}")
    
    data = response.json()
    businesses = data.get('businesses', [])
    
    # Format for our app
    candidates = []
    for biz in businesses:
        candidates.append({
            'id': biz['id'],
            'name': biz['name'],
            'rating': biz['rating'],
            'price': biz.get('price', '$$'),
            'categories': [c['title'] for c in biz.get('categories', [])],
            'address': ', '.join(biz['location']['display_address']),
            'phone': biz.get('phone', ''),
            'url': biz['url'],
            'image_url': biz.get('image_url', ''),
            'snippet': f"Highly rated {biz.get('categories', [{}])[0].get('title', 'restaurant')} with {biz['review_count']} reviews"
        })
    
    return candidates

def parse_ai_response(data: Dict) -> List[Dict]:
    """Parse Yelp AI API response into candidate format"""
    # This will vary based on actual AI API response structure
    # Adjust based on Yelp's documentation
    candidates = data.get('businesses', [])
    return candidates

def extract_cuisine_term(preferences: str) -> str:
    """Extract main cuisine/food type from natural language"""
    cuisines = ['italian', 'mexican', 'chinese', 'japanese', 'thai', 'indian', 
                'french', 'mediterranean', 'american', 'pizza', 'sushi', 'bbq', 'vegan', 'vegetarian']
    
    prefs_lower = preferences.lower()
    for cuisine in cuisines:
        if cuisine in prefs_lower:
            return cuisine
    
    return 'restaurants'
