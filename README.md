\# 🍽️ PickIt - Group Restaurant Decision Maker



\*\*Stop arguing. Start eating.\*\*



PickIt is an AI-powered web app that helps groups make restaurant decisions quickly and democratically. Share a link, collect preferences, and let AI find the perfect spots. Then vote together and celebrate with confetti! 🎉



\## 🚀 Live Demo



\*\*\[Try PickIt Now →](https://pickit-flask.onrender.com/)\*\*



\## ✨ Features



\- \*\*⚡ Lightning Fast\*\* - Create a session in seconds, no account required

\- \*\*🤖 AI-Powered\*\* - Smart restaurant matching using Yelp's database

\- \*\*🗳️ Democratic Voting\*\* - Fair, transparent, real-time voting

\- \*\*📱 Mobile-First\*\* - Works perfectly on any device

\- \*\*🎯 Smart Matching\*\* - Combines dietary restrictions, budgets, cuisines, and vibes

\- \*\*🎉 Delightful UX\*\* - Beautiful cards, animations, and confetti celebrations



\## 🎬 How It Works



1\. \*\*Create \& Share\*\* - Start a session with your location and share the link with your group

2\. \*\*Submit Preferences\*\* - Everyone describes what they're craving (e.g., "tacos under $20")

3\. \*\*AI Finds Options\*\* - Our AI analyzes all preferences and suggests perfect matches

4\. \*\*Vote \& Decide\*\* - Everyone votes on the options, winner is revealed with confetti!



\## 🛠️ Tech Stack



\- \*\*Backend:\*\* Python, Flask

\- \*\*Frontend:\*\* Vanilla JavaScript, CSS3

\- \*\*AI/API:\*\* Yelp Fusion API

\- \*\*Hosting:\*\* Render.com

\- \*\*Version Control:\*\* Git/GitHub



\## 📦 Installation



\### Prerequisites



\- Python 3.8+

\- Yelp API Key (\[Get one here](https://www.yelp.com/developers))



\### Local Setup



Clone the repository

git clone https://github.com/tbullitt18-collab/pickit-flask.git

cd pickit-flask



Create virtual environment

python -m venv venv

source venv/bin/activate # On Windows: venv\\Scripts\\activate



Install dependencies

pip install -r requirements.txt



Create .env file

echo "YELP\_API\_KEY=your\_api\_key\_here" > .env

echo "SECRET\_KEY=your\_secret\_key\_here" >> .env



Run the app

python app.py





Visit `http://localhost:5000` in your browser.



\## 🚢 Deployment



\### Deploy to Render



1\. Push your code to GitHub

2\. Connect your repo to \[Render](https://render.com)

3\. Add environment variables:

&nbsp;  - `YELP\_API\_KEY`

&nbsp;  - `SECRET\_KEY`

4\. Deploy!



\### Environment Variables



YELP\_API\_KEY=your\_yelp\_api\_key

SECRET\_KEY=random\_secret\_string

PORT=5000



text



\## 📁 Project Structure



pickit-flask/

├── app.py # Main Flask application

├── yelp\_client.py # Yelp API integration

├── requirements.txt # Python dependencies

├── Procfile # Render deployment config

├── templates/

│ ├── landing.html # Landing page

│ └── app.html # Main application

└── static/

├── app.js # Frontend logic

└── style.css # Styling



text



\## 🎨 Screenshots



\### Landing Page

\*Beautiful hero section with clear value proposition\*



\### Create Session

\*Simple session creation with location input\*



\### Restaurant Cards

\*Gorgeous cards with photos, ratings, and real-time vote counts\*



\### Winner Celebration

\*Confetti animation and restaurant details\*



\## 🤝 Contributing



Contributions are welcome! Please feel free to submit a Pull Request.



1\. Fork the repository

2\. Create your feature branch (`git checkout -b feature/AmazingFeature`)

3\. Commit your changes (`git commit -m 'Add some AmazingFeature'`)

4\. Push to the branch (`git push origin feature/AmazingFeature`)

5\. Open a Pull Request



\## 📝 License



This project is open source and available under the \[MIT License](LICENSE).



\## 🙏 Acknowledgments



\- \[Yelp Fusion API](https://www.yelp.com/fusion) for restaurant data

\- \[Render](https://render.com) for hosting

\- All the indecisive foodies who inspired this project



\## 📧 Contact



Created by \[@tbullitt18-collab](https://github.com/tbullitt18-collab)



\*\*Live App:\*\* \[pickit-flask.onrender.com](https://pickit-flask.onrender.com/)



---



Made with ❤️ for people who can't decide where to eat

