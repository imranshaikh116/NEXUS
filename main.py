from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
import requests
from skill_roadmaps import SKILL_ROADMAPS
from pydantic import BaseModel



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow frontend
    allow_credentials=True,
    allow_methods=["*"],  # allow POST, OPTIONS, etc
    allow_headers=["*"],
)


# Load career data
with open("careers.json", "r", encoding="utf-8") as f:
    careers = json.load(f)


@app.post("/recommend-career")
def recommend_career(student: dict):
    recommendations = []

    for career in careers:
        interest_match = len(
            set(student["interests"]).intersection(set(career["interests"]))
        )

        if interest_match > 0:
            missing_skills = list(
                set(career["required_skills"]) - set(student["current_skills"])
            )

            recommendations.append({
                "career": career["career"],
                "interest_match_score": interest_match,
                "missing_skills": missing_skills,
                "difficulty": career["difficulty"],
                "branch": career.get("branch", []),
                "required_skills": career.get("required_skills", []),
                "tools": career.get("tools", []),
                "certifications": career.get("certifications", []),
                "exams": career.get("exams", []),
                "future_trends": career.get("future_trends", []),
                "startup_guidance": career.get("startup_guidance", None)
            })

    recommendations.sort(
        key=lambda x: x["interest_match_score"], reverse=True
    )

    return {
        "student": student["name"],
        "recommended_careers": recommendations[:3]
    }


@app.post("/quiz-recommend-career")
def quiz_recommend_career(data: dict):
    """
    Recommend careers based on quiz domain.
    Domain mapping:
    - T (Technical): Programming, AI, Technology, Data, Cloud, Security, etc.
    - C (Creative): Design, Media, Animation, Gaming, etc.
    - B (Business): Management, Sales, Marketing, Finance, etc.
    - S (Social): Education, Healthcare, Community, Counseling, etc.
    - R (Research): Research, Science, Analysis, etc.
    """
    domain = data.get("domain", "")
    
    # Map quiz domains to relevant interests from careers.json
    domain_interests = {
        "T": [  # Technical
            "Programming", "AI", "Technology", "Data", "Cloud", "Security",
            "Automation", "Robotics", "IoT", "Embedded Systems", "Software",
            "Web Development", "Machine Learning", "Computer Vision",
            "Networking", "Blockchain", "Quantum Computing"
        ],
        "C": [  # Creative
            "Design", "Media", "Animation", "Gaming", "Creative", 
            "Art", "Visual", "UX", "UI", "Graphics", "Multimedia",
            "Video", "Audio", "Photography", "Content Creation"
        ],
        "B": [  # Business
            "Management", "Business", "Sales", "Marketing", "Finance",
            "Entrepreneurship", "Product", "Strategy", "Operations",
            "Consulting", "Project Management", "Leadership", "Planning"
        ],
        "S": [  # Social
            "Education", "Healthcare", "Community", "Counseling", "Social",
            "Teaching", "Training", "Wellness", "Human Services",
            "Non-profit", "Public Health", "Clinical", "Rehabilitation"
        ],
        "R": [  # Research
            "Research", "Science", "Analysis", "Investigation",
            "Data Analysis", "Statistics", "Academic", "Theoretical",
            "Experimental", "Scientific", "Genomics", "Physics"
        ]
    }
    
    relevant_interests = domain_interests.get(domain, domain_interests["T"])
    
    recommendations = []

    for career in careers:
        # Calculate match based on career interests matching the domain
        interest_match = len(
            set(career["interests"]).intersection(set(relevant_interests))
        )

        if interest_match > 0:
            missing_skills = list(
                set(career["required_skills"]) - set(data.get("current_skills", []))
            )

            recommendations.append({
                "career": career["career"],
                "interest_match_score": interest_match,
                "missing_skills": missing_skills,
                "difficulty": career["difficulty"],
                "branch": career.get("branch", []),
                "required_skills": career.get("required_skills", []),
                "tools": career.get("tools", []),
                "certifications": career.get("certifications", []),
                "exams": career.get("exams", []),
                "future_trends": career.get("future_trends", [])
            })

    # Sort by interest match score
    recommendations.sort(
        key=lambda x: x["interest_match_score"], reverse=True
    )

    # Return top 5 recommendations instead of 3 for quiz results
    return {
        "domain": domain,
        "domain_name": {
            "T": "Technical",
            "C": "Creative", 
            "B": "Business",
            "S": "Social",
            "R": "Research"
        }.get(domain, "General"),
        "recommended_careers": recommendations[:5]
    }


@app.post("/skill-gap")
def skill_gap(student: dict):
    result = {}

    for career in careers:
        if career["career"] == student.get("target_career"):
            result["career"] = career["career"]
            result["missing_skills"] = list(
                set(career["required_skills"]) - set(student["current_skills"])
            )

    return result


@app.post("/learning-roadmap")
def learning_roadmap(student: dict):
    target_career = student.get("target_career")
    current_skills = student.get("current_skills", [])

    for career in careers:
        if career["career"] == target_career:
            missing_skills = list(
                set(career["required_skills"]) - set(current_skills)
            )

            roadmap = {}
            for skill in missing_skills:
                if skill in SKILL_ROADMAPS:
                    roadmap[skill] = SKILL_ROADMAPS[skill]
                else:
                    roadmap[skill] = {
                        "beginner": ["Learn basics of " + skill],
                        "intermediate": ["Practice " + skill],
                        "advanced": ["Build projects using " + skill]
                    }

            return {
                "career": target_career,
                "missing_skills": missing_skills,
                "learning_roadmap": roadmap
            }

    return {"error": "Career not found"}


@app.post("/career-chat")
def career_chat(data: dict):
    prompt = f"""
You are an expert career guidance counselor for engineering students.

Student Profile:
- Education: {data.get("education")}
- Interests: {data.get("interests")}
- Current Skills: {data.get("current_skills")}

Recommended Career: {data.get("career")}
Missing Skills: {data.get("missing_skills")}

User Question:
{data.get("question")}

Answer clearly, practically, and in simple language.
Give actionable advice.
"""
    
    # Try to connect to local LLM first
    try:
        response = requests.post(
            "http://localhost:1234/v1/chat/completions",
            headers={
                "Content-Type": "application/json"
            },
            json={
                "model": "local-model",
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.4
            },
            timeout=10
        )
        
        if response.status_code == 200:
            return {
                "response": response.json()["choices"][0]["message"]["content"]
            }
    except Exception as e:
        print(f"LLM connection failed: {e}")

    # Fallback to rule-based chatbot
    response_text = get_rule_based_response(data)
    return {"response": response_text}


def get_rule_based_response(data: dict) -> str:
    """Rule-based fallback chatbot for career guidance"""
    question = data.get("question", "").lower()
    career = data.get("career", "")
    missing_skills = data.get("missing_skills", [])
    interests = data.get("interests", [])
    
    # Normalize career name
    career_lower = career.lower() if career else ""
    
    # Define career-specific guidance
    career_guidance = {
        "software engineer": {
            "description": "Software Engineers design, develop, and maintain software systems and applications.",
            "skills": ["Programming", "Data Structures", "Algorithms", "Version Control", "Testing"],
            "career_path": "Junior Dev → Senior Dev → Tech Lead → Engineering Manager → CTO",
            "salary_range": "₹3-6L (Junior) to ₹30L+ (Senior)",
            "growth_tips": "Contribute to open source, build projects, learn cloud technologies"
        },
        "data scientist": {
            "description": "Data Scientists analyze complex data to help organizations make better decisions.",
            "skills": ["Python", "Machine Learning", "Statistics", "SQL", "Data Visualization"],
            "career_path": "Junior Data Scientist → Data Scientist → Senior Data Scientist → Lead/Principal → Chief Data Officer",
            "salary_range": "₹4-8L (Junior) to ₹35L+ (Senior)",
            "growth_tips": "Kaggle competitions, publish research, learn deep learning"
        },
        "ai engineer": {
            "description": "AI Engineers develop and implement artificial intelligence solutions.",
            "skills": ["Python", "TensorFlow/PyTorch", "Machine Learning", "Neural Networks", "MLOps"],
            "career_path": "Junior AI Engineer → AI Engineer → Senior AI Engineer → AI Lead → AI Director",
            "salary_range": "₹5-10L (Junior) to ₹40L+ (Senior)",
            "growth_tips": "Build ML projects, read research papers, contribute to AI open source"
        },
        "web developer": {
            "description": "Web Developers create and maintain websites and web applications.",
            "skills": ["HTML/CSS", "JavaScript", "React/Angular/Vue", "Node.js", "APIs"],
            "career_path": "Junior Developer → Frontend/Backend Developer → Senior Developer → Lead → Architect",
            "salary_range": "₹3-6L (Junior) to ₹25L+ (Senior)",
            "growth_tips": "Build a strong portfolio, learn modern frameworks, contribute to projects"
        },
        "devops engineer": {
            "description": "DevOps Engineers bridge the gap between development and operations.",
            "skills": ["Linux", "Docker", "Kubernetes", "CI/CD", "Cloud Platforms"],
            "career_path": "Jr. DevOps → DevOps Engineer → Sr. DevOps → DevOps Lead → SRE Manager",
            "salary_range": "₹4-8L (Junior) to ₹30L+ (Senior)",
            "growth_tips": "Get cloud certifications, automate everything, learn infrastructure as code"
        },
        "cybersecurity": {
            "description": "Security Engineers protect systems and data from cyber threats.",
            "skills": ["Network Security", "Penetration Testing", "Security Tools", "Compliance", "Incident Response"],
            "career_path": "Security Analyst → Security Engineer → Senior Security → Security Lead → CISO",
            "salary_range": "₹4-8L (Junior) to ₹35L+ (Senior)",
            "growth_tips": "Get certifications (CISSP, CEH), participate in bug bounties, stay updated"
        }
    }
    
    # Find matching career guidance
    guidance = None
    for key, value in career_guidance.items():
        if key in career_lower or career_lower in key:
            guidance = value
            break
    
    # Keyword-based response system
    keywords = {
        "salary": [
            "salary", "package", "money", "earn", "compensation", "ctc"
        ],
        "skills": [
            "skill", "learn", "technology", "tech", "language", "framework", "missing"
        ],
        "growth": [
            "growth", "future", "career path", "promotion", "advance", "progress"
        ],
        "job": [
            "job", "interview", "resume", "hiring", "placement", "hunt"
        ],
        "education": [
            "course", "degree", "study", "college", "university", "masters"
        ],
        "startup": [
            "startup", "entrepreneurship", "own business", "founder"
        ],
        "remote": [
            "remote", "work from home", "wfh", "flexible"
        ]
    }
    
    # Detect question category
    category = None
    for cat, words in keywords.items():
        for word in words:
            if word in question:
                category = cat
                break
        if category:
            break
    
    # Default category if no match
    if not category:
        category = "general"
    
    # Generate response based on category
    if category == "salary":
        if guidance:
            return f"💰 **Salary Overview for {career}:**\n\n{guidance['salary_range']}\n\n📈 **Factors affecting salary:**\n• Your skills and experience level\n• Company size and industry\n• Location (metro cities offer more)\n• Negotiation skills\n\nWould you like more specific salary information for a particular company or location?"
        else:
            return f"💰 **Salary Information for {career}:**\n\nSalaries vary based on:\n• Experience level (entry-level to senior)\n• Company type (FAANG, startups, service-based)\n• Location (metro vs tier-2 cities)\n• Your skill set\n\n**Typical ranges:**\n• Entry level: ₹3-6 LPA\n• Mid-level: ₹8-20 LPA\n• Senior level: ₹20-50+ LPA\n\nSpecific companies like Google, Microsoft, Amazon offer 20-50% higher packages."
    
    elif category == "skills":
        if missing_skills:
            return f"🎯 **Skills to Develop for {career}:**\n\n**Priority Skills:**\n" + "\n".join([f"• {skill}" for skill in missing_skills[:5]]) + f"\n\n**Recommended Learning Path:**\n1. Start with fundamentals of each skill\n2. Build practical projects\n3. Get certifications if available\n4. Practice on platforms like HackerRank\n5. Contribute to open source\n\n**Learning Resources:**\n• Coursera, Udemy for courses\n• YouTube tutorials\n• Official documentation\n• Hands-on projects"
        elif guidance:
            return f"🎯 **Essential Skills for {career}:**\n\n" + "\n".join([f"• {skill}" for skill in guidance['skills']]) + f"\n\n**How to build these skills:**\n1. **Programming:** Practice daily on LeetCode, HackerRank\n2. **Frameworks:** Follow official docs and build projects\n3. **Tools:** Get hands-on experience through internships\n4. **Soft Skills:** Take leadership roles in college projects\n\n**Recommended Resources:**\n• Online courses (Coursera, edX)\n• Books and documentation\n• Bootcamps and workshops"
        else:
            return f"🎯 **Skills Development for {career}:**\n\nTo excel in this career path, focus on:\n\n**Technical Skills:**\n• Programming languages relevant to your field\n• Data structures and algorithms\n• Version control (Git)\n• Problem-solving abilities\n\n**Soft Skills:**\n• Communication\n• Team collaboration\n• Time management\n• Continuous learning mindset\n\n**Action Steps:**\n1. Identify specific skills needed from job postings\n2. Create a learning schedule\n3. Build real-world projects\n4. Get feedback and improve"
    
    elif category == "growth":
        if guidance:
            return f"📈 **Career Growth Path for {career}:**\n\n**Typical Progression:**\n{guidance['career_path']}\n\n**Growth Tips:**\n• {guidance['growth_tips']}\n\n**Key Milestones:**\n• 0-2 years: Building fundamentals\n• 2-5 years: Specializing and taking ownership\n• 5+ years: Leadership and strategic impact\n\n**What employers look for at each level:**\n• Junior: Learning ability, coding skills\n• Senior: Technical depth, mentoring\n• Lead: Strategy, people management"
        else:
            return f"📈 **Career Growth in {career}:**\n\n**Growth Strategies:**\n1. **Continuous Learning:** Stay updated with industry trends\n2. **Network:** Build professional relationships\n3. **Mentorship:** Find mentors and become one\n4. **Visibility:** Contribute to projects and communities\n5. **Results:** Deliver measurable impact\n\n**Timeline:**\n• Year 1-2: Learn and adapt\n• Year 2-5: Specialize and lead\n• Year 5+: Strategic impact and leadership\n\n**Accelerate Your Growth:**\n• Switch to product companies for faster growth\n• Consider international opportunities\n• Build a strong personal brand"
    
    elif category == "job":
        return f"💼 **Job Search Tips for {career}:**\n\n**Resume Tips:**\n• Highlight relevant projects and skills\n• Use action verbs and quantify achievements\n• Tailor resume for each application\n• Include GitHub/portfolio links\n\n**Interview Preparation:**\n• Practice coding on LeetCode\n• Prepare system design questions\n• Study company-specific questions\n• Mock interviews with peers\n\n**Where to Apply:**\n• Company career pages\n• LinkedIn, Naukri, Indeed\n• referrals (most effective!)\n• Campus placements\n\n**Top Companies:**\nFAANG, Microsoft, Goldman Sachs, and growing startups"
    
    elif category == "education":
        return f"📚 **Educational Path for {career}:**\n\n**Minimum Requirements:**\n• Bachelor's degree in relevant field\n• Strong foundation in programming/math\n\n**Recommended Courses:**\n• Data Structures & Algorithms\n• Database Management Systems\n• Operating Systems\n• Computer Networks\n\n**Higher Studies (Optional):**\n• M.Tech for research roles\n• MBA for management roles\n• Certifications for specific skills\n\n**Self-Learning:**\n• Online platforms: Coursera, edX, Udemy\n• Bootcamps for intensive training\n• Open source contributions"
    
    elif category == "startup":
        return f"🚀 **Startup Guidance for {career}:**\n\n**Starting a Tech Startup:**\n1. **Validate your idea:** Research market needs\n2. **Build an MVP:** Start with minimum features\n3. **Find co-founders:** Complementary skills\n4. **Get initial users:** Early adopter program\n5. **Seek funding:** Angels, VCs, incubators\n\n**Essential Skills:**\n• Technical expertise (you need to build!)\n• Business development\n• Marketing and sales\n• Fundraising\n\n**Resources:**\n• Startup incubators (Y Combinator, 91springboard)\n• Government schemes\n• Angel networks\n\n**Risk Assessment:**\n• High risk, high reward\n• Ensure financial runway of 12-18 months"
    
    elif category == "remote":
        return f"🏠 **Remote Work in {career}:**\n\n**Remote-Friendly Aspects:**\n• Software development is highly remote-friendly\n• Data science roles often allow remote work\n• DevOps and cloud roles are remote-friendly\n\n**Tips for Remote Success:**\n• Create a dedicated workspace\n• Maintain regular hours\n• Over-communicate with team\n• Use collaboration tools effectively\n• Build strong online presence\n\n**Companies Offering Remote:**\n• Most tech companies post-pandemic\n• Product companies are more flexible\n• Check job descriptions for remote policy\n\n**Building Remote Career:**\n• Time zone alignment matters\n• Strong communication is key\n• Self-discipline and motivation essential"
    
    else:
        # General career advice
        if guidance:
            return f"🤖 **{career} Overview:**\n\n{guidance['description']}\n\n**What you'll do:**\n• Design and implement solutions\n• Collaborate with cross-functional teams\n• Stay updated with technology trends\n• Solve complex problems\n\n**Best suited for you if:**\n• You enjoy problem-solving\n• You like continuous learning\n• You're detail-oriented\n• You work well in teams\n\n**Getting Started:**\n1. Build a strong foundation in basics\n2. Create projects for your portfolio\n3. Network with professionals\n4. Apply for internships\n\nWould you like more specific information about any aspect?"
        elif career:
            return f"🤖 **{career} Career Guidance:**\n\nThis is a great career choice for engineering students!\n\n**To succeed in this field:**\n• Focus on core technical skills\n• Build practical projects\n• Stay updated with industry trends\n• Network with professionals\n\n**Next Steps:**\n1. Identify specific skills needed\n2. Create a learning roadmap\n3. Start building projects\n4. Apply for relevant positions\n\nWould you like personalized advice based on your profile?"
        else:
            return f"🤖 **Career Guidance Assistant:**\n\nI'd be happy to help with your career questions! You can ask me about:\n\n• 💰 Salary and compensation\n• 🎯 Skills to learn and develop\n• 📈 Career growth and progression\n• 💼 Job search and interview tips\n• 📚 Education and courses\n• 🚀 Startup and entrepreneurship\n• 🏠 Remote work opportunities\n\n**To provide better guidance:**\n1. Fill in your profile details\n2. Get career recommendations\n3. Ask specific questions\n\nWhat would you like to know more about?"

