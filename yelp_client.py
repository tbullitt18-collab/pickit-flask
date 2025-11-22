import os
import requests
from typing import List, Dict

YELP_API_KEY = os.getenv('YELP_API_KEY')
YELP_AI_ENDPOINT = 'https://api.yelp.com/ai/chat/v2'  # Correct v2 endpoint
YELP_SEARCH_ENDPOINT = 'https://api.yelp.com/v3/businesses/search'

def get_candidates_from_yelp_ai(preferences: str, location: str) -> List[Dict]:
    """
    Query Yelp AI API with natural language
    """
    if not YELP_API_KEY:
        raise ValueError("YELP_API_KEY not set in environment")

    headers = {
        'Authorization': f'Bearer {YELP_API_KEY}',
        'Content-Type': 'application/json'
    }

    # AI v2 endpoint expects 'query' parameter
    payload = {
        'query': f"Find highly rated restaurants in {location} for: {preferences}"
    }

    try:
        response = requests.post(
            YELP_AI_ENDPOINT,
            json=payload,
            headers=headers,
            timeout=15
        )

        if response.status_code == 200:
            data = response.json()
            print(f"AI API Success: {data}")
            # AI returns conversational text, we need to extract businesses
            # Use fallback to get structured data
            return fallback_search(preferences, location, headers)
        else:
            print(f"AI API returned {response.status_code}: {response.text}")
            return fallback_search(preferences, location, headers)

    except Exception as e:
        print(f"Yelp AI API error: {e}")
        return fallback_search(preferences, location, headers)

def fallback_search(preferences: str, location: str, headers: Dict) -> List[Dict]:
    """Fallback to Yelp Fusion search API"""
    
    params = {
        'term': preferences,
        'location': location,
        'limit': 6,
        'sort_by': 'rating'
    }
    
    response = requests.get(
        YELP_SEARCH_ENDPOINT,
        params=params,
        headers=headers,
        timeout=10
    )
    
    if response.status_code == 200:
        data = response.json()
        return format_candidates(data.get('businesses', []))
    else:
        raise Exception(f"Yelp API error: {response.status_code}")

def format_candidates(businesses: List[Dict]) -> List[Dict]:
    """Format businesses for our app"""
    candidates = []
    for biz in businesses:
        candidates.append({
            'id': biz.get('id', ''),
            'name': biz.get('name', ''),
            'rating': biz.get('rating', 0),
            'price': biz.get('price', '$$'),
            'categories': [c.get('title', '') for c in biz.get('categories', [])],
            'address': ', '.join(biz.get('location', {}).get('display_address', [])),
            'phone': biz.get('phone', ''),
            'url': biz.get('url', ''),
            'image_url': biz.get('image_url', ''),
            'snippet': f"Highly rated {biz.get('categories', [{}])[0].get('title', 'restaurant')} with {biz.get('review_count', 0)} reviews"
        })
    return candidates
