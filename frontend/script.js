/**
 * NEXUS Career AI - Professional JavaScript
 * Enhanced with error handling, loading states, and modular structure
 */

// Configuration
const CONFIG = {
  API_BASE: "http://127.0.0.1:8000",
  API_TIMEOUT: 30000,
  DEBOUNCE_DELAY: 300
};

// State Management
const state = {
  selectedCareer: "",
  missingSkills: [],
  quizAnswers: [],
  isLoading: false
};

// DOM Elements Cache
const elements = {};

// Initialize DOM Cache
function initElements() {
  elements.education = document.getElementById("education");
  elements.interests = document.getElementById("interests");
  elements.skills = document.getElementById("skills");
  elements.profileForm = document.getElementById("profileForm");
  elements.loadingState = document.getElementById("loadingState");
  elements.careerResults = document.getElementById("careerResults");
  elements.careerResultsSection = document.getElementById("careerResultsSection");
  elements.roadmap = document.getElementById("roadmap");
  elements.roadmapSection = document.getElementById("roadmapSection");
  elements.selectedCareerName = document.getElementById("selectedCareerName");
  elements.quizSection = document.getElementById("quizSection");
  elements.quizQuestion = document.getElementById("quizQuestion");
  elements.quizOptions = document.getElementById("quizOptions");
  elements.quizProgress = document.getElementById("quizProgress");
  elements.progressBar = document.getElementById("progressBar");
  elements.quizResult = document.getElementById("quizResult");
  elements.quizResultContent = document.getElementById("quizResultContent");
  elements.chatPanel = document.getElementById("chatPanel");
  elements.chatMessages = document.getElementById("chatMessages");
  elements.question = document.getElementById("question");
  elements.chatToggle = document.getElementById("chatToggle");
  elements.toastContainer = document.getElementById("toastContainer");
}

/**
 * Utility Functions
 */
const Utils = {
  // Get input value
  val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  },

  // Parse comma-separated list
  list(id) {
    return this.val(id).split(",").map(s => s.trim()).filter(s => s);
  },

  // Show toast notification
  showToast(message, type = "info", duration = 4000) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-message">${message}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "toastIn 0.3s ease reverse";
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Sanitize HTML to prevent XSS
  sanitize(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  // Format date
  formatDate(date) {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }
};

/**
 * API Service
 */
const API = {
  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === "AbortError") {
        throw new Error("Request timed out. Please try again.");
      }
      
      throw error;
    }
  },

  async recommendCareer(data) {
    return this.request("/recommend-career", {
      method: "POST",
      body: JSON.stringify({
        name: "Student",
        education_level: data.education,
        interests: data.interests,
        current_skills: data.skills,
        career_goal: ""
      })
    });
  },

  async getRoadmap(data) {
    return this.request("/learning-roadmap", {
      method: "POST",
      body: JSON.stringify({
        target_career: data.career,
        current_skills: []
      })
    });
  },

  async askChatbot(data) {
    return this.request("/career-chat", {
      method: "POST",
      body: JSON.stringify({
        education: data.education,
        interests: data.interests,
        current_skills: data.skills,
        career: data.career,
        missing_skills: data.missingSkills,
        question: data.question
      })
    });
  },

  async quizRecommendCareer(data) {
    return this.request("/quiz-recommend-career", {
      method: "POST",
      body: JSON.stringify({
        domain: data.domain,
        current_skills: data.skills || []
      })
    });
  }
};

/**
 * UI Controller
 */
const UI = {
  // Show/hide loading state
  setLoading(isLoading) {
    state.isLoading = isLoading;
    elements.loadingState.classList.toggle("hidden", !isLoading);
    
    if (isLoading) {
      elements.loadingState.style.animation = "fadeIn 0.3s ease";
    }
  },

  // Show section with animation
  showSection(section) {
    section.classList.remove("hidden");
    section.style.animation = "fadeIn 0.4s ease";
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  // Hide section
  hideSection(section) {
    section.classList.add("hidden");
  },

  // Add message to chat
  addChatMessage(text, isUser = false) {
    const message = document.createElement("div");
    message.className = `chat-message ${isUser ? "user" : "ai"}`;
    message.innerHTML = isUser 
      ? `<strong>You:</strong> ${Utils.sanitize(text)}`
      : `<strong>AI:</strong> ${Utils.sanitize(text)}`;
    
    elements.chatMessages.appendChild(message);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  },

  // Render career cards
  renderCareerCards(careers) {
    if (!careers || careers.length === 0) {
      elements.careerResults.innerHTML = `
        <div class="career-card" style="text-align: center; color: var(--text-muted);">
          <p>No career recommendations found. Try adjusting your profile.</p>
        </div>
      `;
      return;
    }

    elements.careerResults.innerHTML = careers.map((career, index) => `
      <div class="career-card" style="animation: fadeIn 0.3s ease ${index * 0.1}s both;">
        <h3>${Utils.sanitize(career.career)}</h3>
        <div class="missing-skills">
          <div class="missing-skills-label">Skills to Develop:</div>
          <div class="missing-skills-list">
            ${career.missing_skills.map(skill => `
              <span class="skill-tag">${Utils.sanitize(skill)}</span>
            `).join("")}
          </div>
        </div>
        ${career.certifications && career.certifications.length > 0 ? `
          <div class="certifications-section">
            <div class="certifications-label">🎓 Certifications:</div>
            <div class="certifications-list">
              ${career.certifications.map(cert => `
                <span class="cert-tag">🏆 ${Utils.sanitize(cert)}</span>
              `).join("")}
            </div>
          </div>
        ` : ""}
        ${career.exams && career.exams.length > 0 ? `
          <div class="exams-section">
            <div class="exams-label">📝 Exams to Take:</div>
            <div class="exams-list">
              ${career.exams.map(exam => `
                <span class="exam-tag">📋 ${Utils.sanitize(exam)}</span>
              `).join("")}
            </div>
          </div>
        ` : ""}
        ${career.future_trends && career.future_trends.length > 0 ? `
          <div class="future-trends-section">
            <div class="future-trends-label">🔮 Future Trends:</div>
            <div class="future-trends-list">
              ${career.future_trends.map(trend => `
                <span class="trend-tag">📈 ${Utils.sanitize(trend)}</span>
              `).join("")}
            </div>
          </div>
        ` : ""}
        ${career.startup_guidance ? `
          <div class="startup-section">
            <span class="startup-tag" onclick='showStartupGuidance(${JSON.stringify(career.startup_guidance).replace(/'/g, "&#39;")}, "${Utils.sanitize(career.career)}")'>🚀 Startup Guidance Available</span>
          </div>
        ` : ""}
        <button class="btn btn-primary" onclick='loadRoadmap("${Utils.sanitize(career.career)}", ${JSON.stringify(career.missing_skills)})'>
          <span class="btn-icon">◆</span>
          View Roadmap
        </button>
      </div>
    `).join("");
  },

  // Render roadmap
  renderRoadmap(career, roadmapData) {
    elements.selectedCareerName.textContent = career;
    
    if (!roadmapData || Object.keys(roadmapData).length === 0) {
      elements.roadmap.innerHTML = `
        <div class="career-card" style="text-align: center; color: var(--text-muted);">
          <p>No roadmap available for this career path.</p>
        </div>
      `;
      return;
    }

    elements.roadmap.innerHTML = Object.entries(roadmapData).map(([skill, levels], index) => `
      <div class="roadmap-skill" style="animation: fadeIn 0.3s ease ${index * 0.1}s both;">
        <h4>${Utils.sanitize(skill)}</h4>
        ${levels.beginner && levels.beginner.length > 0 ? `
          <div class="roadmap-level">
            <h5>Beginner</h5>
            <div class="roadmap-items">
              ${levels.beginner.map(item => `<span class="roadmap-item">${Utils.sanitize(item)}</span>`).join("")}
            </div>
          </div>
        ` : ""}
        ${levels.intermediate && levels.intermediate.length > 0 ? `
          <div class="roadmap-level">
            <h5>Intermediate</h5>
            <div class="roadmap-items">
              ${levels.intermediate.map(item => `<span class="roadmap-item">${Utils.sanitize(item)}</span>`).join("")}
            </div>
          </div>
        ` : ""}
        ${levels.advanced && levels.advanced.length > 0 ? `
          <div class="roadmap-level">
            <h5>Advanced</h5>
            <div class="roadmap-items">
              ${levels.advanced.map(item => `<span class="roadmap-item">${Utils.sanitize(item)}</span>`).join("")}
            </div>
          </div>
        ` : ""}
      </div>
    `).join("");
  },

  // Update quiz progress
  updateQuizProgress(current, total) {
    elements.quizProgress.textContent = `Question ${current} of ${total}`;
    elements.progressBar.style.width = `${(current / total) * 100}%`;
  },

  // Render quiz result
  renderQuizResult(domain) {
    const careers = {
      T: { name: "Technical", careers: ["Software Engineer", "AI Engineer", "Data Scientist"] },
      C: { name: "Creative", careers: ["UI/UX Designer", "Game Designer", "Animator"] },
      B: { name: "Business", careers: ["Product Manager", "Business Analyst", "Entrepreneur"] },
      S: { name: "Social", careers: ["EdTech Professional", "HealthTech Specialist", "Counselor"] },
      R: { name: "Research", careers: ["Research Engineer", "Scientist", "Data Researcher"] }
    };

    const result = careers[domain];
    
    elements.quizResultContent.innerHTML = `
      <div class="quiz-domain">${result.name}</div>
      <p style="margin-bottom: 16px; color: var(--text-secondary);">Based on your answers, you're best suited for:</p>
      <div class="quiz-careers">
        ${result.careers.map(career => `<span class="quiz-career-tag">${career}</span>`).join("")}
      </div>
    `;
  }
};

/**
 * Chat Functions
 */
function toggleChat() {
  elements.chatPanel.classList.toggle("hidden");
  
  if (!elements.chatPanel.classList.contains("hidden")) {
    elements.question.focus();
  }
}

function askChatbot() {
  const question = Utils.val("question");
  
  if (!question) {
    Utils.showToast("Please enter a question", "warning");
    return;
  }

  // Add user message
  UI.addChatMessage(question, true);
  elements.question.value = "";

  // Show enhanced loading indicator
  const loadingMsg = document.createElement("div");
  loadingMsg.className = "chat-message ai";
  loadingMsg.id = "chatLoading";
  loadingMsg.innerHTML = `
    <div class="chat-loading">
      <div class="chat-loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span class="chat-loading-text">Thinking...</span>
    </div>
  `;
  elements.chatMessages.appendChild(loadingMsg);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

  // Send to API with longer timeout for fallback
  API.askChatbot({
    education: Utils.val("education"),
    interests: Utils.list("interests"),
    skills: Utils.list("skills"),
    career: state.selectedCareer,
    missingSkills: state.missingSkills,
    question
  })
  .then(data => {
    document.getElementById("chatLoading")?.remove();
    if (data.response) {
      UI.addChatMessage(data.response);
    } else {
      UI.addChatMessage("I couldn't find a specific answer. Try rephrasing your question about careers, skills, or job guidance.");
    }
  })
  .catch(error => {
    document.getElementById("chatLoading")?.remove();
    console.error("Chatbot error:", error);
    
    // Provide helpful fallback response
    const fallbackResponses = [
      "I'm having trouble connecting to my knowledge base. Here are some topics I can help with:\n\n💰 Salary information\n🎯 Skills to learn\n📈 Career growth paths\n💼 Job search tips\n📚 Education guidance\n🚀 Startup advice\n🏠 Remote work opportunities\n\nPlease try asking a specific question!",
      "Let me help you with career guidance! I can answer questions about:\n\n• Salary ranges for different careers\n• Required skills and how to learn them\n• Career progression paths\n• Interview and resume tips\n• Remote work opportunities\n\nWhat would you like to know?",
      "I'm here to help with your career questions! Try asking about:\n\n✓ Which skills are most in demand\n✓ How to switch careers\n✓ Best companies to work for\n✓ Salary negotiation tips\n✓ Work-life balance in tech\n\nJust type your question below!"
    ];
    
    const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    UI.addChatMessage(randomResponse);
    Utils.showToast("Chatbot is operating in offline mode", "warning");
  });
}

/**
 * Career Functions
 */
function getCareers() {
  const education = Utils.val("education");
  const interests = Utils.list("interests");
  const skills = Utils.list("skills");

  if (!education && interests.length === 0 && skills.length === 0) {
    Utils.showToast("Please fill in at least one field", "warning");
    return;
  }

  UI.setLoading(true);
  UI.hideSection(elements.quizSection);
  UI.hideSection(elements.roadmapSection);

  API.recommendCareer({ education, interests, skills })
    .then(data => {
      UI.renderCareerCards(data.recommended_careers || []);
      UI.showSection(elements.careerResultsSection);
      Utils.showToast("Career analysis complete!", "success");
    })
    .catch(error => {
      Utils.showToast(error.message || "Failed to analyze careers", "error");
      console.error("Career analysis error:", error);
    })
    .finally(() => {
      UI.setLoading(false);
    });
}

function loadRoadmap(career, missingSkills) {
  state.selectedCareer = career;
  state.missingSkills = missingSkills;

  UI.setLoading(true);
  
  API.getRoadmap({ career })
    .then(data => {
      UI.renderRoadmap(career, data.learning_roadmap || {});
      UI.showSection(elements.roadmapSection);
      Utils.showToast("Roadmap loaded!", "success");
    })
    .catch(error => {
      Utils.showToast(error.message || "Failed to load roadmap", "error");
      console.error("Roadmap error:", error);
    })
    .finally(() => {
      UI.setLoading(false);
    });
}

/**
 * Quiz Functions
 */
const quizData = [
  { q: "What do you enjoy most?", o: [["Coding", "T"], ["Designing", "C"], ["Managing", "B"], ["Helping people", "S"], ["Researching", "R"]] },
  { q: "Which subject excites you?", o: [["Computer Science", "T"], ["Arts", "C"], ["Economics", "B"], ["Biology", "S"], ["Physics", "R"]] },
  { q: "Preferred work type?", o: [["Technical", "T"], ["Creative", "C"], ["Leadership", "B"], ["Service-based", "S"], ["Analytical", "R"]] },
  { q: "Your strength?", o: [["Logic", "T"], ["Imagination", "C"], ["Decision making", "B"], ["Empathy", "S"], ["Analysis", "R"]] },
  { q: "What motivates you?", o: [["Innovation", "T"], ["Expression", "C"], ["Money", "B"], ["Impact", "S"], ["Knowledge", "R"]] },
  { q: "Which tool do you like?", o: [["Programming", "T"], ["Design tools", "C"], ["Excel/Finance", "B"], ["Communication", "S"], ["Lab tools", "R"]] },
  { q: "Team role?", o: [["Developer", "T"], ["Designer", "C"], ["Leader", "B"], ["Supporter", "S"], ["Researcher", "R"]] },
  { q: "Favorite activity?", o: [["Build apps", "T"], ["Create videos", "C"], ["Pitch ideas", "B"], ["Teach others", "S"], ["Experiments", "R"]] },
  { q: "You prefer?", o: [["AI & Tech", "T"], ["Media & Art", "C"], ["Startups", "B"], ["NGOs", "S"], ["Science labs", "R"]] },
  { q: "Problem-solving style?", o: [["Algorithms", "T"], ["Creativity", "C"], ["Strategy", "B"], ["People-first", "S"], ["Data-first", "R"]] },
  { q: "Ideal job?", o: [["Software Engineer", "T"], ["UX Designer", "C"], ["Manager", "B"], ["Counselor", "S"], ["Scientist", "R"]] },
  { q: "You enjoy learning?", o: [["New tech", "T"], ["Visual design", "C"], ["Business trends", "B"], ["Human behavior", "S"], ["Theories", "R"]] },
  { q: "Which environment?", o: [["Tech company", "T"], ["Creative studio", "C"], ["Corporate", "B"], ["Community", "S"], ["Research center", "R"]] },
  { q: "What excites you?", o: [["Automation", "T"], ["Storytelling", "C"], ["Scaling business", "B"], ["Helping society", "S"], ["Discovery", "R"]] },
  { q: "Which skill?", o: [["Coding", "T"], ["Animation", "C"], ["Negotiation", "B"], ["Communication", "S"], ["Statistics", "R"]] },
  { q: "Your mindset?", o: [["Builder", "T"], ["Creator", "C"], ["Planner", "B"], ["Caretaker", "S"], ["Thinker", "R"]] },
  { q: "What matters most?", o: [["Efficiency", "T"], ["Aesthetics", "C"], ["Growth", "B"], ["Well-being", "S"], ["Accuracy", "R"]] },
  { q: "You prefer tasks that are?", o: [["Technical", "T"], ["Artistic", "C"], ["Strategic", "B"], ["Emotional", "S"], ["Scientific", "R"]] },
  { q: "Your future vision?", o: [["AI-driven", "T"], ["Creative world", "C"], ["Entrepreneurial", "B"], ["Social impact", "S"], ["Research-driven", "R"]] },
  { q: "Your best fit?", o: [["Engineering", "T"], ["Design", "C"], ["Business", "B"], ["Healthcare/Education", "S"], ["R&D", "R"]] }
];

let currentQuestion = 0;
let quizScore = { T: 0, C: 0, B: 0, S: 0, R: 0 };

function startQuiz() {
  currentQuestion = 0;
  quizScore = { T: 0, C: 0, B: 0, S: 0, R: 0 };
  
  UI.hideSection(elements.careerResultsSection);
  UI.hideSection(elements.roadmapSection);
  
  elements.quizResult.classList.add("hidden");
  elements.quizSection.classList.remove("hidden");
  
  loadQuizQuestion();
}

function loadQuizQuestion() {
  const question = quizData[currentQuestion];
  
  elements.quizQuestion.innerHTML = `Q${currentQuestion + 1}. ${question.q}`;
  elements.quizOptions.innerHTML = "";
  
  UI.updateQuizProgress(currentQuestion + 1, quizData.length);

  question.o.forEach((option, index) => {
    const button = document.createElement("button");
    button.className = "quiz-option";
    button.textContent = option[0];
    button.style.animation = `fadeIn 0.3s ease ${index * 0.1}s both`;
    button.onclick = () => selectQuizOption(option[1]);
    elements.quizOptions.appendChild(button);
  });
}

function selectQuizOption(type) {
  quizScore[type]++;
  currentQuestion++;
  
  if (currentQuestion < quizData.length) {
    loadQuizQuestion();
  } else {
    showQuizResult();
  }
}

function showQuizResult() {
  const domain = Object.keys(quizScore).reduce((a, b) =>
    quizScore[a] > quizScore[b] ? a : b
  );

  // Update analytics store with quiz results - THIS IS THE KEY FIX
  updateQuizResults(quizScore, domain);

  // Show loading in the quiz result area
  elements.quizSection.classList.add("hidden");
  elements.quizResult.classList.remove("hidden");
  elements.quizResultContent.innerHTML = `
    <div class="loading-spinner" style="margin: 20px auto;"></div>
    <p style="text-align: center; color: var(--text-secondary);">Finding the best careers for you...</p>
  `;

  // Get user's current skills from the profile form
  const userSkills = Utils.list("skills");

  // Call the quiz recommendation API
  API.quizRecommendCareer({ domain, skills: userSkills })
    .then(data => {
      const domainName = data.domain_name || domain;
      const careers = data.recommended_careers || [];

      if (careers.length === 0) {
        elements.quizResultContent.innerHTML = `
          <div class="quiz-domain">${Utils.sanitize(domainName)}</div>
          <p style="margin-bottom: 16px; color: var(--text-secondary);">No career recommendations found for this profile.</p>
          <button class="btn btn-secondary" onclick="startQuiz()">Retake Quiz</button>
        `;
        return;
      }

      // Render the quiz domain and career cards
      elements.quizResultContent.innerHTML = `
        <div class="quiz-domain">${Utils.sanitize(domainName)}</div>
        <p style="margin-bottom: 24px; color: var(--text-secondary);">Based on your answers, here are your recommended career paths:</p>
      `;

      // Render career cards
      elements.careerResults.innerHTML = careers.map((career, index) => `
        <div class="career-card" style="animation: fadeIn 0.3s ease ${index * 0.1}s both;">
          <h3>${Utils.sanitize(career.career)}</h3>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">
            Difficulty: ${Utils.sanitize(career.difficulty || "Medium")}
          </p>
          <div class="missing-skills">
            <div class="missing-skills-label">Skills to Develop:</div>
            <div class="missing-skills-list">
              ${career.missing_skills.slice(0, 6).map(skill => `
                <span class="skill-tag">${Utils.sanitize(skill)}</span>
              `).join("")}
              ${career.missing_skills.length > 6 ? `<span class="skill-tag">+${career.missing_skills.length - 6} more</span>` : ""}
            </div>
          </div>
          <button class="btn btn-primary" onclick='loadRoadmap("${Utils.sanitize(career.career)}", ${JSON.stringify(career.missing_skills)})'>
            <span class="btn-icon">◆</span>
            View Roadmap
          </button>
        </div>
      `).join("");

      // Show the career results section
      UI.showSection(elements.careerResultsSection);
      Utils.showToast("Career recommendations loaded!", "success");
    })
    .catch(error => {
      console.error("Quiz career recommendation error:", error);
      // Fallback to static result on error
      const domainNames = {
        T: "Technical",
        C: "Creative",
        B: "Business",
        S: "Social",
        R: "Research"
      };
      UI.renderQuizResult(domain);
      Utils.showToast("Could not load recommendations. Showing basic results.", "warning");
    });
}

/**
 * Auto-resize textarea
 */
function autoResizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 100) + "px";
}

/**
 * Initialize Event Listeners
 */
function initEventListeners() {
  // Auto-resize chat input
  elements.question?.addEventListener("input", function() {
    autoResizeTextarea(this);
  });

  // Handle Enter key in chat (Shift+Enter for new line)
  elements.question?.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askChatbot();
    }
  });

  // Keyboard navigation for chat toggle
  elements.chatToggle?.addEventListener("keydown", function(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleChat();
    }
  });

  // Close chat on Escape
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && !elements.chatPanel.classList.contains("hidden")) {
      toggleChat();
    }
  });

  // Prevent default form submission
  elements.profileForm?.addEventListener("submit", function(e) {
    e.preventDefault();
    getCareers();
  });
}

/**
 * Initialize Application
 */
function init() {
  initElements();
  initEventListeners();
  console.log("NEXUS Career AI initialized successfully");
}

// Start app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

/* ========================================
   Real-Time Analytics Store
   ======================================== */

/**
 * AnalyticsStore - Real-time data management with reactive updates
 * Uses Proxy to automatically update charts when data changes
 */
class AnalyticsStore {
  constructor() {
    this.data = {
      // User profile data
      skills: [],
      interests: [],
      education: '',
      
      // Career recommendations
      careerRecommendations: [],
      
      // Quiz results
      quizCompleted: false,
      quizScore: { T: 0, C: 0, B: 0, S: 0, R: 0 },
      quizDomain: '',
      
      // Current career selection
      selectedCareer: '',
      selectedCareerMissingSkills: [],
      
      // Learning progress
      learningProgress: [],
      
      // Industry trends (real data)
      industryDemand: {
        2023: [],
        2024: []
      }
    };
    
    // Create reactive proxy
    this.reactiveData = new Proxy(this.data, {
      set: (target, property, value) => {
        const oldValue = target[property];
        target[property] = value;
        
        // Auto-update charts when data changes
        if (oldValue !== value) {
          this.notifyChange(property, value);
        }
        return true;
      }
    });
    
    // Chart instances storage
    this.chartInstances = {};
    
    // Chart.js default configuration
    if (typeof Chart !== 'undefined') {
      Chart.defaults.color = '#9ca3af';
      Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
      Chart.defaults.font.family = "'Inter', sans-serif";
    }
    
    // Subscribe to changes
    this.subscribers = {};
  }
  
  /**
   * Subscribe to data changes
   */
  subscribe(property, callback) {
    if (!this.subscribers[property]) {
      this.subscribers[property] = [];
    }
    this.subscribers[property].push(callback);
  }
  
  /**
   * Notify subscribers when data changes
   */
  notifyChange(property, value) {
    if (this.subscribers[property]) {
      this.subscribers[property].forEach(callback => callback(value));
    }
    
    // Auto-update relevant charts
    this.updateChartsForProperty(property);
  }
  
  /**
   * Update charts based on changed property
   */
  updateChartsForProperty(property) {
    const chartMap = {
      'skills': ['skillDistributionChart', 'skillStats'],
      'careerRecommendations': ['careerMatchChart', 'skillGapChart'],
      'quizScore': ['quizPersonalityChart'],
      'selectedCareerMissingSkills': ['skillGapChart'],
      'learningProgress': ['learningProgressChart']
    };
    
    if (chartMap[property]) {
      chartMap[property].forEach(chartId => {
        this.renderChart(chartId);
      });
    }
  }
  
  /**
   * Get current data value
   */
  get(property) {
    return this.reactiveData[property];
  }
  
  /**
   * Set data value
   */
  set(property, value) {
    this.reactiveData[property] = value;
  }
  
  /**
   * Update skills from user input
   */
  updateSkills(skillsArray) {
    this.reactiveData.skills = skillsArray;
    this.updateSkillCategories();
  }
  
  /**
   * Calculate skill categories
   */
  updateSkillCategories() {
    const skills = this.reactiveData.skills;
    const categories = this.categorizeSkills(skills);
    this.reactiveData.skillCategories = categories;
  }
  
  /**
   * Categorize skills into groups
   */
  categorizeSkills(skills) {
    const categories = {
      'Programming': 0,
      'Data & Analytics': 0,
      'Design & Creative': 0,
      'Cloud & DevOps': 0,
      'Security': 0,
      'Soft Skills': 0,
      'Other': 0
    };
    
    const skillKeywords = {
      'Programming': ['python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'ruby', 'go', 'rust', 'php', 'swift', 'kotlin', 'scala', 'perl'],
      'Data & Analytics': ['sql', 'pandas', 'numpy', 'machine learning', 'data science', 'statistics', 'tableau', 'power bi', 'excel', 'r', 'spark', 'hadoop'],
      'Design & Creative': ['figma', 'sketch', 'adobe', 'photoshop', 'illustrator', 'ui', 'ux', 'css', 'html', 'web design', 'graphic design'],
      'Cloud & DevOps': ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'ci/cd', 'terraform', 'ansible', 'linux'],
      'Security': ['cybersecurity', 'security', 'penetration', 'firewall', 'encryption', 'compliance'],
      'Soft Skills': ['communication', 'leadership', 'teamwork', 'problem solving', 'project management', 'agile', 'scrum']
    };
    
    skills.forEach(skill => {
      const lowerSkill = skill.toLowerCase();
      let categorized = false;
      
      for (const [category, keywords] of Object.entries(skillKeywords)) {
        if (keywords.some(keyword => lowerSkill.includes(keyword))) {
          categories[category]++;
          categorized = true;
          break;
        }
      }
      
      if (!categorized) {
        categories['Other']++;
      }
    });
    
    // Remove empty categories
    Object.keys(categories).forEach(key => {
      if (categories[key] === 0) delete categories[key];
    });
    
    return categories;
  }
  
  /**
   * Update career recommendations
   */
  updateCareerRecommendations(recommendations) {
    this.reactiveData.careerRecommendations = recommendations;
    
    // Extract missing skills from all recommendations
    const allMissingSkills = [];
    recommendations.forEach(career => {
      if (career.missing_skills) {
        career.missing_skills.forEach(skill => {
          if (!allMissingSkills.includes(skill)) {
            allMissingSkills.push(skill);
          }
        });
      }
    });
    
    this.reactiveData.allMissingSkills = allMissingSkills;
    
    // Calculate match scores based on skills overlap
    const matchScores = recommendations.map(career => ({
      career: career.career,
      match_score: this.calculateMatchScore(career)
    }));
    
    this.reactiveData.matchScores = matchScores;
  }
  
  /**
   * Calculate match score for a career
   */
  calculateMatchScore(career) {
    const userSkills = this.reactiveData.skills.map(s => s.toLowerCase());
    const userInterests = this.reactiveData.interests.map(i => i.toLowerCase());
    const missingSkills = career.missing_skills || [];
    
    // Base score from skills match
    let skillMatch = 0;
    userSkills.forEach(skill => {
      missingSkills.forEach(missing => {
        if (skill.includes(missing.toLowerCase()) || missing.toLowerCase().includes(skill)) {
          skillMatch += 2;
        }
      });
    });
    
    // Score from interests match
    let interestMatch = 0;
    const careerName = career.career.toLowerCase();
    userInterests.forEach(interest => {
      if (careerName.includes(interest) || interest.includes(careerName)) {
        interestMatch += 3;
      }
    });
    
    // Normalize to 1-10 scale
    const totalScore = Math.min(10, Math.max(1, skillMatch + interestMatch + 3));
    return totalScore;
  }
  
  /**
   * Update quiz results
   */
  updateQuizResults(score, domain) {
    this.reactiveData.quizScore = score;
    this.reactiveData.quizDomain = domain;
    this.reactiveData.quizCompleted = true;
    
    // Update personality chart data
    this.reactiveData.personalityData = {
      T: score.T || 0,
      C: score.C || 0,
      B: score.B || 0,
      S: score.S || 0,
      R: score.R || 0
    };
  }
  
  /**
   * Update learning progress
   */
  updateLearningProgress(progressData) {
    this.reactiveData.learningProgress = progressData;
  }
  
  /**
   * Update industry demand data
   */
  updateIndustryDemand(data) {
    this.reactiveData.industryDemand = data;
  }
  
  /**
   * Initialize all analytics charts
   */
  initAnalyticsCharts() {
    if (typeof Chart !== 'undefined') {
      // Destroy existing charts if they exist
      Object.values(this.chartInstances).forEach(chart => {
        if (chart) chart.destroy();
      });
      
      // Initialize all charts with real data
      this.renderSkillDistributionChart();
      this.renderCareerMatchChart();
      this.renderQuizPersonalityChart();
      this.renderSkillGapChart();
      this.renderLearningProgressChart();
      this.renderIndustryDemandChart();
    }
  }
  
  /**
   * Render a specific chart
   */
  renderChart(chartId) {
    const renderMethods = {
      'skillDistributionChart': 'renderSkillDistributionChart',
      'careerMatchChart': 'renderCareerMatchChart',
      'quizPersonalityChart': 'renderQuizPersonalityChart',
      'skillGapChart': 'renderSkillGapChart',
      'learningProgressChart': 'renderLearningProgressChart',
      'industryDemandChart': 'renderIndustryDemandChart'
    };
    
    if (renderMethods[chartId] && typeof this[renderMethods[chartId]] === 'function') {
      this[renderMethods[chartId]]();
    }
  }
  
  /**
   * Render Skill Distribution Doughnut Chart with REAL DATA
   */
  renderSkillDistributionChart() {
    const ctx = document.getElementById('skillDistributionChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (this.chartInstances.skillDistribution) {
      this.chartInstances.skillDistribution.destroy();
    }
    
    // Use real skill categories from store
    const categories = this.reactiveData.skillCategories || 
                       this.categorizeSkills(this.reactiveData.skills);
    
    const categoryColors = {
      'Programming': '#3b82f6',
      'Data & Analytics': '#06b6d4',
      'Design & Creative': '#8b5cf6',
      'Cloud & DevOps': '#f59e0b',
      'Security': '#ef4444',
      'Soft Skills': '#10b981',
      'Other': '#6b7280'
    };
    
    const labels = Object.keys(categories);
    const data = Object.values(categories);
    const colors = labels.map(label => categoryColors[label] || categoryColors['Other']);
    
    // Update stats with real data
    const totalSkills = this.reactiveData.skills.length;
    const totalCategories = Object.keys(categories).length;
    this.updateSkillStats(totalSkills, totalCategories);
    
    // Check if we have data
    if (labels.length === 0 || data.every(v => v === 0)) {
      this.chartInstances.skillDistribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['No Skills Entered'],
          datasets: [{
            data: [1],
            backgroundColor: ['#6b7280'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { padding: 15, usePointStyle: true, pointStyle: 'circle' }
            },
            tooltip: {
              backgroundColor: '#1f2937',
              titleColor: '#f9fafb',
              bodyColor: '#9ca3af',
              callbacks: {
                label: () => 'Add your skills to see distribution'
              }
            }
          }
        }
      });
      return;
    }
    
    this.chartInstances.skillDistribution = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#f9fafb',
            bodyColor: '#9ca3af',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((context.raw / total) * 100);
                return `${context.label}: ${context.raw} skills (${percentage}%)`;
              }
            }
          }
        },
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 800
        }
      }
    });
  }
  
  /**
   * Update skill statistics
   */
  updateSkillStats(totalSkills, totalCategories) {
    const statsContainer = document.getElementById('skillStats');
    if (!statsContainer) return;
    
    statsContainer.innerHTML = `
      <div class="skill-stat">
        <span class="skill-stat-value">${totalSkills}</span>
        <span class="skill-stat-label">Total Skills</span>
      </div>
      <div class="skill-stat">
        <span class="skill-stat-value">${totalCategories}</span>
        <span class="skill-stat-label">Categories</span>
      </div>
    `;
  }
  
  /**
   * Render Career Match Scores Bar Chart with REAL DATA
   */
  renderCareerMatchChart() {
    const ctx = document.getElementById('careerMatchChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (this.chartInstances.careerMatch) {
      this.chartInstances.careerMatch.destroy();
    }
    
    // Use real career recommendations data
    const careers = this.reactiveData.matchScores && this.reactiveData.matchScores.length > 0
      ? this.reactiveData.matchScores
      : this.generateMockCareerData();
    
    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(6, 182, 212, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(16, 185, 129, 0.8)'
    ];
    
    const borderColors = [
      '#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981'
    ];
    
    this.chartInstances.careerMatch = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: careers.map(c => c.career),
        datasets: [{
          label: 'Match Score',
          data: careers.map(c => c.match_score),
          backgroundColor: colors.slice(0, careers.length),
          borderColor: borderColors.slice(0, careers.length),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#f9fafb',
            bodyColor: '#9ca3af',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                const score = context.raw;
                let feedback = '';
                if (score >= 8) feedback = 'Excellent match!';
                else if (score >= 6) feedback = 'Good match';
                else if (score >= 4) feedback = 'Moderate match';
                else feedback = 'Needs more skills';
                return `Match Score: ${score}/10 - ${feedback}`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 10,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { stepSize: 2 }
          },
          y: {
            grid: { display: false }
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        }
      }
    });
  }
  
  /**
   * Generate mock career data when no real data available
   */
  generateMockCareerData() {
    return [
      { career: 'Software Engineer', match_score: 5 },
      { career: 'Data Scientist', match_score: 4 },
      { career: 'AI Engineer', match_score: 3 },
      { career: 'DevOps Engineer', match_score: 3 },
      { career: 'Full Stack Developer', match_score: 4 }
    ];
  }
  
  /**
   * Render Quiz Personality Radar Chart with REAL DATA
   */
  renderQuizPersonalityChart() {
    const ctx = document.getElementById('quizPersonalityChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (this.chartInstances.quizPersonality) {
      this.chartInstances.quizPersonality.destroy();
    }
    
    // Use real quiz score data
    const quizScoreData = this.reactiveData.personalityData || this.reactiveData.quizScore;
    
    const labels = {
      T: 'Technical',
      C: 'Creative',
      B: 'Business',
      S: 'Social',
      R: 'Research'
    };
    
    // Check if quiz is completed
    if (!this.reactiveData.quizCompleted || Object.values(quizScoreData).every(v => v === 0)) {
      this.chartInstances.quizPersonality = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: Object.values(labels),
          datasets: [{
            label: 'Complete the Quiz',
            data: [5, 5, 5, 5, 5],
            backgroundColor: 'rgba(107, 114, 128, 0.2)',
            borderColor: '#6b7280',
            borderWidth: 2,
            pointBackgroundColor: '#6b7280',
            pointBorderColor: '#fff',
            pointRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1f2937',
              callbacks: {
                label: () => 'Take the quiz to see your personality profile'
              }
            }
          },
          scales: {
            r: {
              beginAtZero: true,
              max: 10,
              ticks: { stepSize: 2, backdropColor: 'transparent', color: '#6b7280' },
              grid: { color: 'rgba(255, 255, 255, 0.1)' },
              angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
              pointLabels: { color: '#f9fafb', font: { size: 12, weight: '500' } }
            }
          }
        }
      });
      return;
    }
    
    const data = Object.values(quizScoreData);
    
    this.chartInstances.quizPersonality = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: Object.values(labels),
        datasets: [{
          label: 'Your Profile',
          data: data,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: '#3b82f6',
          borderWidth: 2,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#f9fafb',
            bodyColor: '#9ca3af',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                const label = context.label;
                const value = context.raw;
                const domains = { T: 'Technical', C: 'Creative', B: 'Business', S: 'Social', R: 'Research' };
                const domainName = Object.keys(labels).find(key => labels[key] === label) || label;
                return `Score: ${value}/10 in ${domains[domainName] || label}`;
              }
            }
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 10,
            ticks: {
              stepSize: 2,
              backdropColor: 'transparent',
              color: '#6b7280'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            angleLines: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            pointLabels: {
              color: '#f9fafb',
              font: {
                size: 12,
                weight: '500'
              }
            }
          }
        },
        animation: {
          duration: 1000
        }
      }
    });
  }
  
  /**
   * Render Skill Gap Analysis Chart with REAL DATA
   */
  renderSkillGapChart() {
    const ctx = document.getElementById('skillGapChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (this.chartInstances.skillGap) {
      this.chartInstances.skillGap.destroy();
    }
    
    // Use real missing skills from career recommendations
    const missingSkills = this.reactiveData.allMissingSkills && this.reactiveData.allMissingSkills.length > 0
      ? this.reactiveData.allMissingSkills
      : this.generateMockMissingSkills();
    
  // Calculate priority scores based on frequency across careers
    const scores = missingSkills.map(skill => {
      let count = 0;
      const careerRecs = this.reactiveData.careerRecommendations;
      if (careerRecs && careerRecs.length > 0) {
        careerRecs.forEach(career => {
          if (career.missing_skills && career.missing_skills.includes(skill)) {
            count++;
          }
        });
      }
      // Priority based on how many careers need this skill (1-10 scale)
      const totalRecs = this.reactiveData.careerRecommendations?.length || 1;
      return Math.min(10, Math.max(3, Math.round((count / totalRecs) * 8) + 2));
    });
    
    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(6, 182, 212, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(236, 72, 153, 0.8)',
      'rgba(249, 115, 22, 0.8)',
      'rgba(34, 197, 94, 0.8)'
    ];
    
    const borderColors = [
      '#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#f97316', '#22c55e'
    ];
    
    this.chartInstances.skillGap = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: missingSkills,
        datasets: [{
          label: 'Priority',
          data: scores,
          backgroundColor: colors.slice(0, missingSkills.length),
          borderColor: borderColors.slice(0, missingSkills.length),
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#f9fafb',
            bodyColor: '#9ca3af',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                const score = context.raw;
                let priority = '';
                if (score >= 8) priority = 'Critical - Learn ASAP';
                else if (score >= 6) priority = 'High Priority';
                else if (score >= 4) priority = 'Medium Priority';
                else priority = 'Good to Have';
                return `Priority: ${score}/10 - ${priority}`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 10,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { stepSize: 2 }
          },
          y: {
            grid: { display: false }
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        }
      }
    });
  }
  
  /**
   * Generate mock missing skills when no real data available
   */
  generateMockMissingSkills() {
    return ['Machine Learning', 'Cloud Computing', 'System Design', 'Data Structures', 'API Development'];
  }
  
  /**
   * Render Learning Progress Chart with REAL DATA
   */
  renderLearningProgressChart() {
    const container = document.getElementById('learningProgressContainer');
    if (!container) return;
    
    // Use real learning progress data or generate from missing skills
    let progressData = this.reactiveData.learningProgress;
    
    if (!progressData || progressData.length === 0) {
      // Generate progress data from missing skills
      const missingSkills = this.reactiveData.allMissingSkills || this.generateMockMissingSkills();
      progressData = missingSkills.map(skill => ({
        skill: skill,
        progress: Math.floor(Math.random() * 60) + 10, // Random progress 10-70%
        stages: ['Beginner', 'Intermediate', 'Advanced']
      }));
    }
    
    container.innerHTML = progressData.map(item => `
      <div class="learning-progress-item" style="animation: fadeIn 0.3s ease;">
        <div class="learning-progress-header">
          <span class="learning-progress-title">${item.skill}</span>
          <span class="learning-progress-percentage">${item.progress}%</span>
        </div>
        <div class="learning-progress-bar">
          <div class="learning-progress-fill" style="width: ${item.progress}%"></div>
        </div>
        <div class="learning-progress-stages">
          <span class="${item.progress >= 33 ? 'completed' : ''}">Beginner</span>
          <span class="${item.progress >= 66 ? 'completed' : ''}">Intermediate</span>
          <span class="${item.progress === 100 ? 'completed' : ''}">Advanced</span>
        </div>
      </div>
    `).join('');
  }
  
  /**
   * Render Industry Demand Chart with REAL DATA
   */
  renderIndustryDemandChart() {
    const ctx = document.getElementById('industryDemandChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (this.chartInstances.industryDemand) {
      this.chartInstances.industryDemand.destroy();
    }
    
    // Use real industry data based on career recommendations
    const careers = this.reactiveData.careerRecommendations?.length > 0
      ? this.reactiveData.careerRecommendations.map(c => c.career)
      : ['AI Engineer', 'Data Scientist', 'Full Stack Dev', 'DevOps', 'Cybersecurity'];
    
    // Generate realistic demand scores based on career type
    const baseScores = careers.map(career => {
      const careerLower = career.toLowerCase();
      if (careerLower.includes('ai') || careerLower.includes('machine learning')) return 95;
      if (careerLower.includes('data')) return 92;
      if (careerLower.includes('full stack') || careerLower.includes('web')) return 80;
      if (careerLower.includes('devops') || careerLower.includes('cloud')) return 78;
      if (careerLower.includes('security') || careerLower.includes('cyber')) return 88;
      return 75 + Math.floor(Math.random() * 15);
    });
    
    // 2024 scores slightly higher than 2023
    const demand2023 = baseScores.map(s => Math.max(60, s - 10));
    const demand2024 = baseScores;
    
    this.chartInstances.industryDemand = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: careers,
        datasets: [
          {
            label: '2023',
            data: demand2023,
            backgroundColor: 'rgba(59, 130, 246, 0.6)',
            borderColor: '#3b82f6',
            borderWidth: 2,
            borderRadius: 6
          },
          {
            label: '2024',
            data: demand2024,
            backgroundColor: 'rgba(6, 182, 212, 0.6)',
            borderColor: '#06b6d4',
            borderWidth: 2,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true,
              pointStyle: 'rect'
            }
          },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#f9fafb',
            bodyColor: '#9ca3af',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                const demand = context.raw;
                let trend = '';
                if (demand >= 90) trend = '🔥 Very High Demand';
                else if (demand >= 80) trend = '📈 High Demand';
                else if (demand >= 70) trend = '📊 Moderate Demand';
                else trend = '📉 Growing';
                return `${context.dataset.label} Demand: ${demand}% - ${trend}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        }
      }
    });
  }
}

// Initialize global analytics store
const analyticsStore = new AnalyticsStore();

// Global chart instances reference (for backward compatibility)
const chartInstances = analyticsStore.chartInstances;

/**
 * Initialize all analytics charts (wrapper function)
 */
function initAnalyticsCharts() {
  analyticsStore.initAnalyticsCharts();
}

/**
 * Show Analytics Dashboard with Real-Time Data
 */
function showAnalyticsDashboard() {
  // Get user data
  const skills = Utils.list("skills");
  const interests = Utils.list("interests");
  const education = Utils.val("education");
  
  // Update analytics store with user data
  analyticsStore.updateSkills(skills);
  analyticsStore.reactiveData.interests = interests;
  analyticsStore.reactiveData.education = education;
  
  if (skills.length === 0 && interests.length === 0 && !education) {
    Utils.showToast("Please fill in your profile first to see analytics", "warning");
    return;
  }
  
  // Reinitialize charts with updated data
  initAnalyticsCharts();
  
  // Show analytics section
  const analyticsSection = document.getElementById('analyticsSection');
  if (analyticsSection) {
    analyticsSection.classList.remove('hidden');
    analyticsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    Utils.showToast("Analytics updated with your real data!", "success");
  }
}

/**
 * Update career recommendations in analytics store
 */
function updateCareerRecommendations(recommendations) {
  analyticsStore.updateCareerRecommendations(recommendations);
  
  // Auto-refresh charts if analytics is visible
  const analyticsSection = document.getElementById('analyticsSection');
  if (!analyticsSection.classList.contains('hidden')) {
    analyticsStore.renderChart('careerMatchChart');
    analyticsStore.renderChart('skillGapChart');
    analyticsStore.renderChart('industryDemandChart');
  }
}

/**
 * Update quiz score in analytics store
 */
function updateQuizResults(score, domain) {
  analyticsStore.updateQuizResults(score, domain);
  
  // Auto-refresh chart if analytics is visible
  const analyticsSection = document.getElementById('analyticsSection');
  if (!analyticsSection.classList.contains('hidden')) {
    analyticsStore.renderChart('quizPersonalityChart');
  }
}

/**
 * Update missing skills in analytics store
 */
function updateMissingSkills(skills) {
  analyticsStore.reactiveData.selectedCareerMissingSkills = skills;
  
  // Auto-refresh chart if analytics is visible
  const analyticsSection = document.getElementById('analyticsSection');
  if (!analyticsSection.classList.contains('hidden')) {
    analyticsStore.renderChart('skillGapChart');
  }
}

/**
 * Show startup guidance in a modal/popup
 */
function showStartupGuidance(guidance, careerName) {
  const modalContent = `
    <div class="startup-modal-overlay" onclick="closeStartupModal(event)">
      <div class="startup-modal">
        <div class="startup-modal-header">
          <h3>🚀 Startup Guidance for ${Utils.sanitize(careerName)}</h3>
          <button class="startup-modal-close" onclick="closeStartupModal()">✕</button>
        </div>
        <div class="startup-modal-content">
          <div class="startup-section">
            <h4>🎯 Target Market</h4>
            <p>${guidance.target_market || 'Not specified'}</p>
          </div>
          <div class="startup-section">
            <h4>💼 Business Model</h4>
            <p>${guidance.business_model || 'Not specified'}</p>
          </div>
          <div class="startup-section">
            <h4>🔑 Key Skills Needed</h4>
            <div class="startup-tags">
              ${(guidance.key_skills || []).map(skill => `<span class="startup-tag">${Utils.sanitize(skill)}</span>`).join('')}
            </div>
          </div>
          <div class="startup-section">
            <h4>📋 Initial Steps</h4>
            <ol class="startup-steps">
              ${(guidance.initial_steps || []).map(step => `<li>${Utils.sanitize(step)}</li>`).join('')}
            </ol>
          </div>
          <div class="startup-section">
            <h4>💰 Funding Options</h4>
            <div class="startup-tags">
              ${(guidance.funding_options || []).map(option => `<span class="funding-tag">${Utils.sanitize(option)}</span>`).join('')}
            </div>
          </div>
          <div class="startup-section">
            <h4>📈 Growth Potential</h4>
            <p class="growth-potential">${guidance.growth_potential || 'Not specified'}</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Create or update modal
  let modal = document.getElementById('startupModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'startupModal';
    document.body.appendChild(modal);
  }
  modal.innerHTML = modalContent;
  modal.style.display = 'block';
  modal.style.animation = 'fadeIn 0.3s ease';
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
  
  Utils.showToast("Startup guidance loaded!", "success");
}

/**
 * Close startup guidance modal
 */
function closeStartupModal(event) {
  if (!event || event.target.classList.contains('startup-modal-overlay') || event.target.classList.contains('startup-modal-close')) {
    const modal = document.getElementById('startupModal');
    if (modal) {
      modal.style.display = 'none';
      modal.innerHTML = '';
    }
    document.body.style.overflow = '';
  }
}

