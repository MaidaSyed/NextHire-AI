"""Interview question generation and answer evaluation logic."""
import difflib
import logging
import re
import string

from services.ai_service import gemini_generate_text
from services.text_utils import average, coerce_list, extract_json_object, safe_int, safe_str, truncate_text

logger = logging.getLogger(__name__)

def _normalize_interview_history(value) -> list[dict]:
    history = coerce_list(value)
    normalized: list[dict] = []
    for item in history:
        if not isinstance(item, dict):
            continue
        strengths = [str(x).strip() for x in coerce_list(item.get("strengths")) if str(x).strip()]
        weaknesses = [str(x).strip() for x in coerce_list(item.get("weaknesses")) if str(x).strip()]
        suggestions = [str(x).strip() for x in coerce_list(item.get("suggestions")) if str(x).strip()]
        normalized.append(
            {
                "question": truncate_text(item.get("question") or item.get("current_question") or "", 700),
                "answer": truncate_text(item.get("answer") or item.get("user_answer") or "", 1000),
                "score": item.get("score"),
                "strengths": strengths,
                "weaknesses": weaknesses,
                "suggestions": suggestions,
                "ideal_answer": truncate_text(item.get("ideal_answer") or item.get("idealAnswer") or "", 1000),
            }
        )
    return normalized


def _interview_settings(payload: dict) -> dict:
    role = str(payload.get("role") or payload.get("job_role") or payload.get("position") or "").strip()
    experience = str(payload.get("experience_level") or payload.get("experience") or payload.get("level") or "").strip()
    interview_type = str(payload.get("interview_type") or payload.get("type") or payload.get("mode") or "").strip()
    question_count = safe_int(payload.get("question_count") or payload.get("questions") or 10, 10)
    question_number = safe_int(payload.get("question_number") or len(coerce_list(payload.get("interview_history"))) + 1, 1)
    return {
        "role": role or "Generalist Candidate",
        "experience_level": experience or "Intermediate",
        "interview_type": interview_type or "Mixed",
        "question_count": max(1, question_count),
        "question_number": max(1, question_number),
    }


def _history_summary(history: list[dict]) -> tuple[str, str]:
    if not history:
        return "No previous interview history.", "balanced"

    scores = [float(item["score"]) for item in history if isinstance(item.get("score"), (int, float))]
    avg_score = average(scores)
    if avg_score is None:
        trend = "balanced"
        guidance = "There are prior questions, but no scored feedback yet. Keep the next question realistic and moderately challenging."
    elif avg_score < 4:
        trend = "easier"
        guidance = "The candidate is struggling. Ask a simpler follow-up question that builds confidence and reveals fundamentals."
    elif avg_score < 7:
        trend = "balanced"
        guidance = "The candidate is doing okay. Keep the question practical, specific, and role-relevant."
    else:
        trend = "harder"
        guidance = "The candidate is performing strongly. Increase difficulty and ask for trade-offs, depth, or concrete examples."

    latest = history[-1]
    if latest.get("weaknesses"):
        guidance += f" Recent weakness to address: {latest['weaknesses'][0]}."
    elif latest.get("strengths"):
        guidance += f" Recent strength to build on: {latest['strengths'][0]}."

    return guidance, trend


def _build_history_prompt(history: list[dict]) -> str:
    if not history:
        return "- No previous questions yet."

    lines = []
    for index, item in enumerate(history[-8:], start=max(1, len(history) - 7)):
        strengths = ", ".join(item.get("strengths") or []) or "None"
        weaknesses = ", ".join(item.get("weaknesses") or []) or "None"
        suggestions = ", ".join(item.get("suggestions") or []) or "None"
        lines.append(
            f"{index}. Q: {item.get('question') or ''}\n"
            f"   A: {item.get('answer') or ''}\n"
            f"   Score: {item.get('score') if item.get('score') is not None else 'N/A'}\n"
            f"   Strengths: {strengths}\n"
            f"   Weaknesses: {weaknesses}\n"
            f"   Suggestions: {suggestions}"
        )
    return "\n".join(lines)


def _normalize_question_signature(text: str) -> str:
    cleaned = str(text or "").strip().lower()
    cleaned = re.sub(rf"[{re.escape(string.punctuation)}]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def _collect_previous_questions(payload: dict, history: list[dict]) -> list[str]:
    candidates: list[str] = []
    for key in ("askedQuestions", "asked_questions", "previous_questions", "question_history"):
        value = payload.get(key)
        if isinstance(value, list):
            candidates.extend(str(item).strip() for item in value if str(item).strip())
        elif isinstance(value, str) and value.strip():
            candidates.append(value.strip())

    for item in history:
        question = str(item.get("question") or item.get("current_question") or "").strip()
        if question:
            candidates.append(question)

    seen = set()
    unique_questions: list[str] = []
    for question in candidates:
        signature = _normalize_question_signature(question)
        if not signature or signature in seen:
            continue
        seen.add(signature)
        unique_questions.append(question)
    return unique_questions


def _is_duplicate_question(candidate: str, previous_questions: list[str]) -> bool:
    candidate_signature = _normalize_question_signature(candidate)
    if not candidate_signature:
        return True

    for previous in previous_questions:
        previous_signature = _normalize_question_signature(previous)
        if not previous_signature:
            continue
        if previous_signature == candidate_signature:
            return True
        if len(candidate_signature) > 20 and len(previous_signature) > 20:
            if difflib.SequenceMatcher(None, candidate_signature, previous_signature).ratio() >= 0.88:
                return True
    return False


def _fallback_question(settings: dict, trend: str, previous_questions: list[str] | None = None) -> dict:
    role = settings["role"]
    experience = settings["experience_level"]
    interview_type = settings["interview_type"]
    question_number = settings.get("question_number", 1)
    previous_questions = previous_questions or []
    previous_signatures = {_normalize_question_signature(q) for q in previous_questions}

    # Vary the fallback questions to avoid repetition
    fallback_options = {
        "easier": [
            f"Can you explain what {role}s typically need to understand about {interview_type.lower()} scenarios?",
            f"Walk me through a day-to-day task you'd handle in a {role} role.",
            f"What's a fundamental concept every {role} should master?",
            f"How would you describe the main responsibility of a {role} to someone new to the field?",
        ],
        "harder": [
            f"Describe a complex technical challenge you'd face as a {role} and how you'd approach it.",
            f"Tell me about a difficult trade-off decision between quality, speed, and cost in a {role} context.",
            f"How would you design a solution that scales for a large {role} challenge?",
            f"What edge cases or failure modes would you plan for when solving a {role}-level problem?",
        ],
        "maintain": [
            f"What's a recent project or task where you applied {interview_type.lower()} thinking as a {role}?",
            f"How do you balance technical depth with practical solutions in a {role} role?",
            f"Tell me about a time when your {role} skills made a measurable difference.",
            f"What tools or methodologies do you find most effective for {role} work?",
            f"How would you handle a situation where your first approach for a {role} task did not work?",
        ],
    }

    # Select a question based on trend and question number for variety
    options = fallback_options.get(trend, fallback_options["maintain"])
    question = None
    for option in options:
        if _normalize_question_signature(option) not in previous_signatures:
            question = option
            break
    if not question:
        question_index = (question_number - 1) % len(options)
        question = options[question_index]

    if trend == "easier":
        difficulty = "Beginner"
    elif trend == "harder":
        difficulty = "Advanced"
    else:
        difficulty = experience

    return {
        "question": question,
        "difficulty": difficulty,
        "focus_area": interview_type,
        "follow_up_style": trend,
        "trend": trend,
        "question_number": settings["question_number"],
        "total_questions": settings["question_count"],
    }


def _analyze_question_type(question: str) -> dict:
    """Analyze question content to determine type and focus areas."""
    q_lower = question.lower()
    
    analysis = {
        "type": "general",
        "is_technical": False,
        "is_behavioral": False,
        "is_communication": False,
        "is_architecture": False,
        "is_problem_solving": False,
        "is_process": False,
        "mentions_tools": [],
    }
    
    # Question type detection
    if any(keyword in q_lower for keyword in ["tell me", "describe", "walk me through", "explain your", "how would you", "what's a time"]):
        analysis["is_behavioral"] = True
        analysis["type"] = "behavioral"
    
    if any(keyword in q_lower for keyword in ["design", "architecture", "system", "scale", "build", "implement", "technology stack"]):
        analysis["is_architecture"] = True
        if analysis["type"] == "general":
            analysis["type"] = "technical"
    
    if any(keyword in q_lower for keyword in ["challenge", "problem", "trade-off", "edge case", "handle", "approach", "solve", "debug"]):
        analysis["is_problem_solving"] = True
        if analysis["type"] == "general":
            analysis["type"] = "technical"
    
    if any(keyword in q_lower for keyword in ["process", "method", "approach", "workflow", "communicate", "present", "explain"]):
        analysis["is_communication"] = True
    
    if any(keyword in q_lower for keyword in ["technical", "code", "api", "database", "algorithm", "performance", "optimization"]):
        analysis["is_technical"] = True
        if analysis["type"] == "general":
            analysis["type"] = "technical"
    
    if any(keyword in q_lower for keyword in ["team", "collaborate", "conflict", "disagreement", "feedback", "deadline", "pressure"]):
        analysis["is_process"] = True
    
    return analysis


def _extract_answer_concepts(answer: str, question: str) -> dict:
    """Extract technologies, concepts, and structured elements from answer."""
    answer_lower = answer.lower()
    
    concepts = {
        "technologies": [],
        "concepts": [],
        "has_examples": False,
        "has_metrics": False,
        "has_outcome": False,
        "response_length": len(answer.split()),
        "uses_star_structure": False,
    }
    
    # Common technology keywords
    tech_keywords = {
        "python", "javascript", "typescript", "java", "react", "node", "django", "flask",
        "fastapi", "sql", "mongodb", "redis", "docker", "kubernetes", "aws", "azure", "gcp",
        "git", "rest", "api", "microservices", "html", "css", "vue", "angular", "nextjs",
        "graphql", "postgresql", "mysql", "nosql", "redis", "elasticsearch", "kafka",
        "ci/cd", "jenkins", "github", "gitlab", "testing", "jest", "pytest", "junit",
        "agile", "scrum", "devops", "linux", "windows", "ssl", "jwt", "oauth", "authentication",
        "performance", "optimization", "caching", "cdn", "cdn", "load", "balance",
    }
    
    for tech in tech_keywords:
        if tech in answer_lower:
            concepts["technologies"].append(tech)
    
    # Check for structured communication patterns
    if any(indicator in answer_lower for indicator in ["situation", "task", "action", "result"]):
        concepts["uses_star_structure"] = True
    
    # Check for concrete elements
    concepts["has_examples"] = any(indicator in answer_lower for indicator in [
        "example", "for instance", "like", "such as", "specifically", "particular", "case"
    ])
    
    concepts["has_metrics"] = bool(re.search(r'\d+\s*%|\d+\s*x|\d+\s*sec|seconds|ms|milliseconds|reduce|increase|improve', answer_lower))
    
    concepts["has_outcome"] = any(indicator in answer_lower for indicator in [
        "result", "outcome", "impact", "improve", "achieve", "success", "learned", "discovered", "found"
    ])
    
    # General concept detection
    concept_keywords = {
        "scalability", "performance", "security", "maintainability", "testing", "documentation",
        "debugging", "architecture", "design pattern", "oop", "functional", "asynchronous", 
        "synchronous", "threading", "concurrency", "caching", "optimization", "refactoring",
        "deployment", "monitoring", "logging", "error handling", "validation", "sanitization",
    }
    
    for concept in concept_keywords:
        if concept in answer_lower:
            concepts["concepts"].append(concept)
    
    return concepts


def _fallback_evaluation(answer_text: str, settings: dict, question: str = "") -> dict:
    """Enhanced fallback evaluation with contextual analysis."""
    word_count = len([w for w in str(answer_text or "").split() if w.strip()])
    
    # Analyze question type for context-aware feedback
    q_analysis = _analyze_question_type(question) if question else {}
    answer_analysis = _extract_answer_concepts(answer_text, question)
    
    # Base scoring on content quality, not just length
    base_score = 5
    if word_count >= 150:
        base_score = 7
    elif word_count >= 80:
        base_score = 6
    elif word_count >= 35:
        base_score = 5
    else:
        base_score = 3
    
    # Bonus points for specific content elements
    if answer_analysis["has_metrics"]:
        base_score += 1
    if answer_analysis["has_examples"]:
        base_score += 0.5
    if answer_analysis["uses_star_structure"] and q_analysis.get("is_behavioral"):
        base_score += 1
    
    # Penalties for negative indicators
    if "i don't know" in answer_text.lower() or "not sure" in answer_text.lower():
        base_score = max(1, base_score - 2)
    if "um" in answer_text.lower() or "uh" in answer_text.lower():
        base_score = max(1, base_score - 0.5)
    
    score = max(1, min(10, int(base_score)))
    
    # Context-aware feedback generation
    strengths = []
    weaknesses = []
    suggestions = []
    
    if score >= 7:
        if answer_analysis["has_metrics"]:
            strengths.append("Good use of specific metrics and quantifiable results.")
        if answer_analysis["has_examples"]:
            strengths.append("Provided concrete examples to support your point.")
        if answer_analysis["response_length"] >= 100:
            strengths.append("Detailed and well-structured response.")
        if not strengths:
            strengths.append("Clear communication and solid technical understanding.")
    elif score >= 5:
        strengths.append("Attempted to provide a structured response.")
        if answer_analysis["has_examples"]:
            strengths.append("Included some relevant examples.")
    else:
        strengths.append("You attempted to answer the question.")
    
    # Role-specific weakness detection
    if q_analysis.get("is_technical"):
        if not answer_analysis["technologies"]:
            weaknesses.append("Missing discussion of specific technologies or tools.")
        if answer_analysis["response_length"] < 50:
            weaknesses.append("Technical explanation lacks sufficient depth.")
        if not answer_analysis["has_metrics"] and "performance" in question.lower():
            weaknesses.append("Missing measurable impact or performance metrics.")
    
    if q_analysis.get("is_behavioral"):
        if not answer_analysis["uses_star_structure"]:
            weaknesses.append("Response could benefit from STAR structure (Situation, Task, Action, Result).")
        if not answer_analysis["has_outcome"]:
            weaknesses.append("Missing the outcome or lesson learned from the situation.")
    
    if not answer_analysis["has_examples"]:
        weaknesses.append("More specific examples would strengthen your answer.")
    
    if not weaknesses:
        weaknesses.append("Add more depth to the technical or behavioral aspects.")
    
    # Context-aware suggestions
    if q_analysis.get("is_technical"):
        suggestions.append("Mention specific technologies or frameworks you'd use.")
        suggestions.append("Discuss trade-offs between different approaches.")
    elif q_analysis.get("is_behavioral"):
        suggestions.append("Use the STAR method: Situation, Task, Action, Result.")
        suggestions.append("Explain what you learned from the experience.")
    
    if not answer_analysis["has_metrics"]:
        suggestions.append("Include measurable outcomes or metrics when possible.")
    
    if answer_analysis["response_length"] < 60:
        suggestions.append("Provide more detailed context to fully address the question.")
    
    suggestions = suggestions[:3]  # Limit to top 3
    if not suggestions:
        suggestions = ["Give concrete examples.", "Explain the measurable impact."]
    
    return {
        "score": score,
        "strengths": strengths or ["You attempted a structured response."],
        "weaknesses": weaknesses or ["Add more specific detail."],
        "suggestions": suggestions,
        "ideal_answer": "A strong answer would include specific examples, measurable outcomes, and demonstrate deep understanding of the role.",
        "communication_rating": max(1, min(10, score + (1 if answer_analysis["response_length"] >= 80 else 0))),
        "technical_rating": max(1, min(10, score if q_analysis.get("is_technical") else score - 1)),
        "confidence_rating": max(1, min(10, score - 1 if score > 2 else 1)),
        "performance_level": "Excellent" if score >= 9 else "Strong" if score >= 8 else "Solid" if score >= 6 else "Developing" if score >= 4 else "Needs Support",
        "follow_up_direction": "harder" if score >= 8 else "maintain" if score >= 5 else "easier",
        "short_feedback": "Your answer has potential, but add more specific examples and measurable outcomes." if score < 7 else "Good response with solid structure and relevant details.",
    }


def _generate_interview_question_from_gemini(payload: dict) -> dict:
    settings = _interview_settings(payload)
    history = _normalize_interview_history(
        payload.get("interview_history")
        or payload.get("previous_interview_history")
        or payload.get("history")
    )
    guidance, trend = _history_summary(history)
    history_prompt = _build_history_prompt(history)
    previous_questions = _collect_previous_questions(payload, history)
    previous_questions_text = "\n".join([f"- {q}" for q in previous_questions]) if previous_questions else "(No previous questions yet)"
    covered_concepts = payload.get("covered_concepts") or []
    if isinstance(covered_concepts, list):
        covered_concepts = [str(c).strip() for c in covered_concepts if str(c).strip()]
    covered_concepts_text = ", ".join(covered_concepts) if covered_concepts else "(No concepts covered yet)"

    prompt = (
        "You are a realistic, professional recruiter/interviewer conducting a continuous interview. "
        "Your job is to ask ONE follow-up question that advances the interview naturally.\n"
        "Return valid JSON only with keys: question, difficulty, focus_area, follow_up_style. "
        "Do not include markdown, numbering, or extra commentary.\n\n"
        
        f"Role: {settings['role']}\n"
        f"Experience level: {settings['experience_level']}\n"
        f"Interview type: {settings['interview_type']}\n"
        f"Question number: {settings['question_number']} of {settings['question_count']}\n"
        f"Adaptive guidance: {guidance}\n"
        f"Suggested trend: {trend}\n\n"
        f"Interview history (most recent last):\n{history_prompt}\n\n"
        f"Previous Q&A history is mandatory context for this request.\n\n"
        
        f"PREVIOUS QUESTIONS ASKED (DO NOT REPEAT OR USE SIMILAR PHRASING):\n{previous_questions_text}\n\n"
        
        f"CONCEPTS ALREADY COVERED (MUST AVOID THESE UNLESS GOING DEEPER):\n{covered_concepts_text}\n\n"
        
        "CRITICAL ANTI-REPETITION RULES:\n"
        "- NEVER ask the exact same question or paraphrase it\n"
        "- NEVER ask about a concept that was already covered (from the list above)\n"
        "- Each question MUST explore a NEW concept, skill, or angle\n"
        "- If you must revisit a concept, make it a DEEP follow-up (e.g., 'How would you handle edge cases?' after discussing basics)\n"
        "- The interview should feel like a natural conversation that evolves and builds\n\n"
        
        "FOLLOW-UP QUESTION BEHAVIOR:\n"
        "- If the candidate performed strongly (score >= 7): Increase depth and ask for trade-offs, edge cases, or architecture decisions\n"
        "- If the candidate did okay (score 5-6): Maintain difficulty and ask about related but different concepts\n"
        "- If the candidate struggled (score < 5): Ask a simpler question about fundamentals or a different angle\n\n"
        
        "PERSONALIZATION:\n"
        "- Reference concrete items from the resume (technologies, projects, achievements) when possible\n"
        "- Build on what the candidate mentioned: 'You mentioned JWT... how would you handle token expiration?'\n"
        "- Vary question types: technical depth, architecture, problem-solving, process, trade-offs\n\n"
        
        "OUTPUT INSTRUCTIONS:\n"
        "- Return ONLY JSON with requested keys (question, difficulty, focus_area, follow_up_style)\n"
        "- The 'question' field must be a single focused question\n"
        "- Do not include any explanation or markdown in the JSON"
    )

    try:
        raw = gemini_generate_text(prompt)
        parsed = extract_json_object(raw)
        question = truncate_text(parsed.get("question") or "", 1000)
        if not question:
            raise ValueError("Missing question text.")
        if _is_duplicate_question(question, previous_questions):
            raise ValueError("Gemini generated a repeated question.")
        logger.info(f"Interview question generated successfully: question_number={settings['question_number']}")
        return {
            "question": question,
            "difficulty": str(parsed.get("difficulty") or settings["experience_level"]),
            "focus_area": str(parsed.get("focus_area") or settings["interview_type"]),
            "follow_up_style": str(parsed.get("follow_up_style") or trend),
            "trend": trend,
            "question_number": settings["question_number"],
            "total_questions": settings["question_count"],
        }
    except Exception as exc:
        logger.warning(f"Interview question Gemini failed (using fallback): {exc}")
        logger.debug(f"Covered concepts: {covered_concepts}")
        logger.debug(f"Previous questions count: {len(previous_questions)}")
        return _fallback_question(settings, trend, previous_questions)


def _evaluate_interview_answer_with_gemini(payload: dict) -> dict:
    settings = _interview_settings(payload)
    history = _normalize_interview_history(
        payload.get("interview_history")
        or payload.get("previous_interview_history")
        or payload.get("history")
    )
    question = truncate_text(payload.get("current_question") or payload.get("question") or "", 1000)
    answer = truncate_text(payload.get("user_answer") or payload.get("answer") or "", 2000)
    history_prompt = _build_history_prompt(history)
    previous_questions = _collect_previous_questions(payload, history)
    previous_questions_text = "\n".join([f"- {q}" for q in previous_questions]) if previous_questions else "(No previous questions yet)"
    
    covered_concepts = payload.get("covered_concepts") or []
    if isinstance(covered_concepts, list):
        covered_concepts = [str(c).strip() for c in covered_concepts if str(c).strip()]
    covered_concepts_text = ", ".join(covered_concepts) if covered_concepts else "(No concepts covered yet)"

    # Analyze question and answer for context-aware evaluation
    question_analysis = _analyze_question_type(question)
    answer_analysis = _extract_answer_concepts(answer, question)

    prompt = (
        "You are a fair, rigorous, and INTELLIGENT interview evaluator acting as a senior hiring manager. "
        "Your evaluations must be ANSWER-AWARE, ROLE-AWARE, and CONTEXT-AWARE. "
        "NEVER give generic feedback like 'be more specific' or 'use examples' to everyone - customize each evaluation based on what was actually said.\n\n"
        "Return valid JSON only with keys: score, strengths, weaknesses, suggestions, ideal_answer, communication_rating, technical_rating, confidence_rating, performance_level, follow_up_direction, short_feedback.\n"
        "score must be an integer from 1 to 10. Ratings must be integers 1-10. Arrays must contain specific, actionable strings.\n"
        "Do not include markdown or extra commentary.\n\n"
        
        f"ROLE: {settings['role']}\n"
        f"EXPERIENCE LEVEL: {settings['experience_level']}\n"
        f"INTERVIEW TYPE: {settings['interview_type']}\n"
        f"QUESTION #{settings['question_number']} OF {settings['question_count']}\n\n"
        
        f"QUESTION ASKED:\n{question}\n\n"
        f"CANDIDATE'S ANSWER:\n{answer}\n\n"
        f"Interview history:\n{history_prompt}\n\n"
        f"Previous Q&A history is mandatory context for this request.\n\n"
        
        f"Previously covered concepts: {covered_concepts_text}\n\n"
        
        "INTELLIGENT EVALUATION FRAMEWORK:\n"
        "=== TECHNICAL ASSESSMENT ===\n"
        "- Is the answer technically correct? If wrong, identify the error.\n"
        "- Are specific technologies, frameworks, or concepts mentioned?\n"
        "- Does the answer show depth or is it surface-level?\n"
        "- Are there trade-offs or architectural considerations discussed?\n\n"
        
        "=== BEHAVIORAL & COMMUNICATION ASSESSMENT ===\n"
        "- Is the answer structured and easy to follow?\n"
        "- Does it use STAR structure (Situation-Task-Action-Result) when relevant?\n"
        "- Are there concrete examples and specific metrics/outcomes?\n"
        "- Is the language professional and confident?\n\n"
        
        "=== ROLE-SPECIFIC CRITERIA ===\n"
        "FOR BACKEND/FRONTEND/FULLSTACK:\n"
        "- Did they discuss scalability, performance, or optimization?\n"
        "- Did they mention testing, debugging, or maintenance?\n"
        "- Did they show awareness of security, validation, or error handling?\n\n"
        
        "FOR HR/BEHAVIORAL:\n"
        "- Does the answer demonstrate collaboration and communication?\n"
        "- Are soft skills (conflict resolution, leadership, adaptation) evident?\n"
        "- Is there evidence of learning from the experience?\n\n"
        
        "FOR DATA/ANALYTICS:\n"
        "- Were data sources, methodologies, or tools discussed?\n"
        "- Did they mention metrics, KPIs, or insights?\n"
        "- Was there discussion of data validation or accuracy?\n\n"
        
        "=== SCORE LOGIC ===\n"
        "10: Expert-level depth, all key aspects covered, concrete examples, leadership demonstration\n"
        "8-9: Strong understanding, specific examples, good structure, minor gaps\n"
        "6-7: Solid basic answer, some examples, generally on track, could go deeper\n"
        "4-5: Surface-level, vague, missing key concepts or specific examples\n"
        "1-3: Incorrect, evasive, or insufficient response\n\n"
        
        "=== STRENGTH DETECTION ===\n"
        "Find SPECIFIC strengths in THEIR answer:\n"
        "- 'You mentioned X technology, which shows knowledge of Y'\n"
        "- 'Your example demonstrates understanding of Z pattern'\n"
        "- 'You correctly identified trade-off between A and B'\n"
        "- 'STAR structure was clear: you explained situation, action, and result'\n"
        "- 'You quantified impact: reduced latency by X%' or similar metrics\n\n"
        
        "=== WEAKNESS DETECTION ===\n"
        "Find SPECIFIC weaknesses based on role and question:\n"
        "- 'You didn't discuss scalability, which is crucial for Backend roles'\n"
        "- 'Missing mention of error handling/edge cases'\n"
        "- 'The outcome/result wasn't explained'\n"
        "- 'Vague on specific technologies that Backend Developers should know'\n"
        "- 'Didn't address the actual question directly'\n\n"
        
        "=== SUGGESTIONS MUST BE SPECIFIC ===\n"
        "- Reference what they said or didn't say\n"
        "- 'You mentioned React but didn't discuss state management - consider exploring Redux, Context API, or Zustand'\n"
        "- 'When discussing API design, include error handling and authentication patterns'\n"
        "- NOT: 'Use concrete examples' (they may have already done this)\n"
        "- Suggest NEW concepts not yet covered, prioritize concepts from the covered list to avoid\n\n"
        
        "=== SHORT_FEEDBACK MUST BE SPECIFIC ===\n"
        "- If score >= 8: 'Strong answer on [topic]. Your mention of [specific detail] shows solid understanding.'\n"
        "- If score 5-7: 'Good foundation. Adding [specific concept] would strengthen your answer.'\n"
        "- If score < 5: 'Consider focusing on [specific weakness]. A recruiter would expect [role-specific detail].'\n"
        "- NEVER generic like 'needs more specificity' (FORBIDDEN - customize to their answer)\n\n"
        
        "=== FOLLOW-UP DIRECTION ===\n"
        "- If score >= 8: 'harder' (ask edge cases, trade-offs, architecture)\n"
        "- If score 5-7: 'maintain' (similar difficulty, different angle or concept)\n"
        "- If score < 5: 'easier' (fundamentals, related basics)\n\n"
        
        "OUTPUT: Return ONLY JSON with ALL requested keys."
    )

    try:
        raw = gemini_generate_text(prompt)
        parsed = extract_json_object(raw)
        score = safe_int(parsed.get("score"), 5)
        strengths = [str(x).strip() for x in coerce_list(parsed.get("strengths")) if str(x).strip()]
        weaknesses = [str(x).strip() for x in coerce_list(parsed.get("weaknesses")) if str(x).strip()]
        suggestions = [str(x).strip() for x in coerce_list(parsed.get("suggestions")) if str(x).strip()]
        ideal_answer = truncate_text(parsed.get("ideal_answer") or parsed.get("idealAnswer") or "", 1400)
        communication_rating = safe_int(parsed.get("communication_rating"), score)
        technical_rating = safe_int(parsed.get("technical_rating"), score)
        confidence_rating = safe_int(parsed.get("confidence_rating"), score)
        performance_level = str(parsed.get("performance_level") or "Solid")
        follow_up_direction = str(parsed.get("follow_up_direction") or "maintain")
        short_feedback = truncate_text(parsed.get("short_feedback") or "", 500)
        if not short_feedback:
            short_feedback = "Your answer shows understanding. Consider adding more specific examples or technical depth."

        follow_up_direction = follow_up_direction if follow_up_direction in {"easier", "maintain", "harder"} else "maintain"

        return {
            "score": max(1, min(10, score)),
            "strengths": strengths or ["You provided a structured response."],
            "weaknesses": weaknesses or ["Add more specific technical or behavioral detail."],
            "suggestions": suggestions or ["Elaborate on your approach.", "Include measurable outcomes."],
            "ideal_answer": ideal_answer or "A strong answer would combine specific examples, technical depth, and measurable impact.",
            "communication_rating": max(1, min(10, communication_rating)),
            "technical_rating": max(1, min(10, technical_rating)),
            "confidence_rating": max(1, min(10, confidence_rating)),
            "performance_level": performance_level,
            "follow_up_direction": follow_up_direction,
            "short_feedback": short_feedback,
            "question": question,
        }
    except Exception as exc:
        logger.warning(f"Interview evaluation fallback: {exc}")
        fallback = _fallback_evaluation(answer, settings, question)
        fallback["question"] = question
        return fallback


def summarize_interview_session(payload: dict) -> dict:
    history = _normalize_interview_history(
        payload.get("interview_history")
        or payload.get("previous_interview_history")
        or payload.get("history")
    )
    settings = _interview_settings(payload)
    score_values = [float(item.get("score")) for item in history if isinstance(item.get("score"), (int, float))]
    communication_values = [
        float(item.get("communication_rating")) for item in history if isinstance(item.get("communication_rating"), (int, float))
    ]
    technical_values = [float(item.get("technical_rating")) for item in history if isinstance(item.get("technical_rating"), (int, float))]
    confidence_values = [
        float(item.get("confidence_rating")) for item in history if isinstance(item.get("confidence_rating"), (int, float))
    ]
    avg_score = average(score_values) or 0

    summary = {
        "overall_score": round(avg_score, 1),
        "performance_level": (
            "Not Started"
            if not history
            else "Excellent"
            if avg_score >= 8.5
            else "Strong"
            if avg_score >= 7
            else "Solid"
            if avg_score >= 5.5
            else "Developing"
            if avg_score >= 4
            else "Needs Support"
        ),
        "communication_rating": round(average(communication_values) or 0, 1),
        "technical_rating": round(average(technical_values) or 0, 1),
        "confidence_rating": round(average(confidence_values) or 0, 1),
        "strong_areas": [],
        "areas_needing_improvement": [],
        "final_feedback_message": "",
        "role": settings["role"],
        "experience_level": settings["experience_level"],
        "interview_type": settings["interview_type"],
    }

    strong_areas: list[str] = []
    improvement_areas: list[str] = []
    for item in history:
        for value in coerce_list(item.get("strengths")):
            text = safe_str(value)
            if text and text not in strong_areas:
                strong_areas.append(text)
        for value in coerce_list(item.get("weaknesses")) + coerce_list(item.get("suggestions")):
            text = safe_str(value)
            if text and text not in improvement_areas:
                improvement_areas.append(text)

    summary["strong_areas"] = strong_areas[:5]
    summary["areas_needing_improvement"] = improvement_areas[:6]
    summary["final_feedback_message"] = (
        safe_str(history[-1].get("short_feedback"), "")
        if history
        else "You completed the interview practice session. Repeat the interview to improve your score and depth."
    )

    rec = "Consider for next-stage interviews"
    if avg_score >= 8.5:
        rec = "Strong hire"
    elif avg_score >= 7:
        rec = "Consider hire (next-stage)"
    elif avg_score >= 5.5:
        rec = "Potential hire with coaching"
    elif avg_score >= 4:
        rec = "Not yet ready; more practice recommended"
    else:
        rec = "Not recommended at this time"

    roadmap = []
    for area in summary["areas_needing_improvement"]:
        roadmap.append(f"Practice: {area}. Work on examples and concrete outcomes.")

    summary["hiring_recommendation"] = rec
    summary["improvement_roadmap"] = roadmap[:6]

    return summary


def generate_interview_question(payload: dict) -> dict:
    return _generate_interview_question_from_gemini(payload)


def evaluate_interview_answer(payload: dict) -> dict:
    return _evaluate_interview_answer_with_gemini(payload)