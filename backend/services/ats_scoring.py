"""Local ATS keyword/semantic scoring (fallback when LLM unavailable)."""
import difflib
import re
import string

_BASE_STOPWORDS = {
    "a",
    "an",
    "the",
    "and",
    "or",
    "of",
    "to",
    "in",
    "for",
    "with",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "on",
    "at",
    "by",
    "from",
    "as",
    "that",
    "this",
    "these",
    "those",
    "it",
    "its",
    "i",
    "we",
    "you",
    "they",
    "them",
    "our",
    "your",
    "their",
    "he",
    "she",
    "his",
    "her",
    "not",
    "but",
    "if",
    "then",
    "so",
    "such",
    "can",
    "could",
    "should",
    "would",
    "will",
    "may",
    "might",
    "must",
    "do",
    "does",
    "did",
    "done",
    "have",
    "has",
    "had",
    "having",
    "about",
    "into",
    "over",
    "under",
    "between",
    "while",
    "during",
    "before",
    "after",
    "up",
    "down",
    "out",
    "off",
    "again",
    "further",
    "here",
    "there",
    "when",
    "where",
    "why",
    "how",
    "all",
    "any",
    "both",
    "each",
    "few",
    "more",
    "most",
    "other",
    "some",
    "no",
    "nor",
    "only",
    "own",
    "same",
    "than",
    "too",
    "very",
}

_SYNONYM_TO_CANONICAL = {
    "teamwork": "collaboration",
    "collaboration": "collaboration",
    "collaborate": "collaboration",
    "api": "rest api",
    "apis": "rest api",
    "rest api": "rest api",
    "rest apis": "rest api",
    "data analysis": "analytics",
    "analytics": "analytics",
}

_PHRASE_SKILLS = {
    "data analysis",
    "machine learning",
    "deep learning",
    "natural language processing",
    "nlp",
    "computer vision",
    "rest api",
    "unit testing",
    "test automation",
    "cloud computing",
    "microservices",
    "project management",
    "agile methodology",
    "scrum master",
    "full stack",
    "frontend developer",
    "backend developer",
    "data science",
    "artificial intelligence",
}

_COMMON_SKILLS = {
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "nextjs",
    "vue",
    "angular",
    "node",
    "flask",
    "django",
    "fastapi",
    "sql",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "git",
    "linux",
    "html",
    "css",
    "tailwind",
    "bootstrap",
    "graphql",
    "rest api",
    "microservices",
    "unit testing",
    "ci",
    "cd",
    "devops",
    "jenkins",
    "terraform",
    "ansible",
}


def _get_stopwords() -> set[str]:
    try:
        import nltk
        from nltk.corpus import stopwords

        try:
            words = set(stopwords.words("english"))
        except Exception:
            nltk.download("stopwords", quiet=True)
            words = set(stopwords.words("english"))
        return _BASE_STOPWORDS | words
    except Exception:
        return set(_BASE_STOPWORDS)


def _tokenize(text: str, stopwords_set: set[str]) -> list[str]:
    if not text:
        return []

    lowered = str(text).lower()
    cleaned = re.sub(r"[^a-z\s]+", " ", lowered)
    cleaned = cleaned.translate(str.maketrans("", "", string.punctuation))
    tokens = cleaned.split()

    result: list[str] = []
    for t in tokens:
        if t in stopwords_set:
            continue
        if len(t) < 2:
            continue
        result.append(t)
    return result


def _normalize_term(term: str) -> str:
    t = term.strip().lower()
    if t in _SYNONYM_TO_CANONICAL:
        return _SYNONYM_TO_CANONICAL[t]
    if t.endswith("s") and len(t) > 3:
        singular = t[:-1]
        if singular in _SYNONYM_TO_CANONICAL:
            return _SYNONYM_TO_CANONICAL[singular]
    return t


def _extract_keywords(tokens: list[str]) -> set[str]:
    if not tokens:
        return set()

    out: set[str] = set()
    out.update(_normalize_term(t) for t in tokens)

    for i in range(len(tokens) - 1):
        phrase = f"{tokens[i]} {tokens[i+1]}"
        normalized = _normalize_term(phrase)
        if normalized in _PHRASE_SKILLS:
            out.add(normalized)

    return out


def _cosine_similarity_fallback(a_keywords: set[str], b_keywords: set[str]) -> float:
    if not a_keywords or not b_keywords:
        return 0.0
    
    # Standard intersection
    intersection = len(a_keywords & b_keywords)
    
    # Add fuzzy matching for similar words (e.g., "developer" vs "development")
    fuzzy_matches = 0
    a_list = list(a_keywords)
    b_list = list(b_keywords)
    
    # Only do fuzzy matching for keywords that aren't already in intersection
    remaining_a = [w for w in a_list if w not in b_keywords]
    remaining_b = [w for w in b_list if w not in a_keywords]
    
    for wa in remaining_a:
        for wb in remaining_b:
            # Simple prefix matching or very close similarity
            if wa.startswith(wb) or wb.startswith(wa) or difflib.SequenceMatcher(None, wa, wb).ratio() > 0.8:
                fuzzy_matches += 0.5
                break # Count each word at most once
                
    total_match = intersection + fuzzy_matches
    denom = (len(a_keywords) * len(b_keywords)) ** 0.5
    return min(1.0, total_match / denom) if denom else 0.0


def _semantic_similarity_score(resume_text: str, jd_text: str) -> float:
    if not resume_text or not jd_text:
        return 0.0

    try:
        from sentence_transformers import SentenceTransformer, util

        if not hasattr(_semantic_similarity_score, "_model"):
            _semantic_similarity_score._model = SentenceTransformer("all-MiniLM-L6-v2")
        model = _semantic_similarity_score._model

        emb1 = model.encode(resume_text, convert_to_tensor=True, normalize_embeddings=True)
        emb2 = model.encode(jd_text, convert_to_tensor=True, normalize_embeddings=True)
        sim = util.cos_sim(emb1, emb2).item()
        return max(0.0, min(1.0, float(sim))) * 100
    except Exception:
        pass

    # Fallback to keyword-based similarity if sentence-transformers fails
    stopwords_set = _get_stopwords()
    resume_keywords = _extract_keywords(_tokenize(resume_text, stopwords_set))
    jd_keywords = _extract_keywords(_tokenize(jd_text, stopwords_set))
    return max(0.0, min(1.0, _cosine_similarity_fallback(resume_keywords, jd_keywords))) * 100


def _analyze_formatting(text: str) -> list[str]:
    issues = []
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    
    if not lines:
        return ["Empty document detected."]
        
    # Check for long paragraphs (poor ATS readability)
    long_paragraphs = 0
    for line in lines:
        if len(line.split()) > 60:
            long_paragraphs += 1
    
    if long_paragraphs > 1:
        issues.append("Detected large text blocks - break them into shorter bullets for better ATS parsing.")
        
    # Check for bullet points (ATS likes them)
    bullet_points = [l for l in lines if l.startswith(('-', '•', '*', '+', '·'))]
    if len(bullet_points) < 5:
        issues.append("Low use of bullet points - use them for better scanability of your achievements.")
        
    # Check for common sections
    text_lower = text.lower()
    missing_sections = []
    if "experience" not in text_lower and "work" not in text_lower and "employment" not in text_lower:
        missing_sections.append("Experience")
    if "education" not in text_lower:
        missing_sections.append("Education")
    if "skill" not in text_lower:
        missing_sections.append("Skills")
        
    if missing_sections:
        issues.append(f"Standard sections missing or poorly labeled: {', '.join(missing_sections)}.")
        
    return issues


def calculate_advanced_ats(resume_text: str, jd_text: str, resume_source: str, jd_source: str) -> dict:
    stopwords_set = _get_stopwords()

    resume_tokens = _tokenize(resume_text, stopwords_set)
    jd_tokens = _tokenize(jd_text, stopwords_set)

    resume_keywords = _extract_keywords(resume_tokens)
    jd_keywords = _extract_keywords(jd_tokens)

    total_jd_keywords = len(jd_keywords)
    total_resume_keywords = len(resume_keywords)

    matched_keywords = sorted(jd_keywords & resume_keywords)
    missing_keywords = sorted(jd_keywords - resume_keywords)

    # Calculate keyword matching score
    keyword_score = 0.0
    if total_jd_keywords:
        keyword_score = (len(matched_keywords) / total_jd_keywords) * 100

    # Calculate semantic similarity
    semantic_score = _semantic_similarity_score(resume_text, jd_text)

    # Extract skills from JD and resume
    jd_skills = set()
    for k in jd_keywords:
        if k in _COMMON_SKILLS or k in _PHRASE_SKILLS:
            jd_skills.add(k)

    resume_skills = set()
    for k in resume_keywords:
        if k in _COMMON_SKILLS or k in _PHRASE_SKILLS:
            resume_skills.add(k)

    important_skills_detected = sorted(resume_skills & jd_skills) if jd_skills else sorted(resume_skills)

    # Calculate skill matching score
    skill_score = 0.0
    if jd_skills:
        skill_score = (len(resume_skills & jd_skills) / len(jd_skills)) * 100
    else:
        skill_score = keyword_score

    # Analyze formatting early to use in scoring
    formatting_issues = _analyze_formatting(resume_text)

    # Enhanced scoring: Weighted formula
    # 40% for core skill matching, 30% semantic relevance, 30% keyword/experience matching
    # Add a small base score if there is any relevance at all
    base_score = 15.0 if (skill_score > 0 or semantic_score > 20 or keyword_score > 0) else 0.0
    
    raw_ats_score = (0.4 * skill_score) + (0.3 * semantic_score) + (0.3 * keyword_score)
    ats_score = base_score + (raw_ats_score * 0.85) # Scale down to fit base score
    
    # Penalize for formatting issues (max -10 points)
    if formatting_issues:
        penalty = min(10, len(formatting_issues) * 2.5)
        ats_score = max(0, ats_score - penalty)

    # Boost score if resume has good semantic match (indicates strong contextual fit)
    if semantic_score > 60 and skill_score > 50:
        ats_score = min(98, ats_score + 7)
    
    # Ensure the score reflects reality - if semantic and skills are both high, final score should be high
    if semantic_score > 70 and skill_score > 60:
        ats_score = max(ats_score, 75)
    
    # Cap at 100
    ats_score = min(100, ats_score)

    suggestions: list[str] = []
    
    # Intelligent suggestions based on gaps
    if skill_score < 50:
        missing_top_skills = list(missing_keywords)[:5]
        if missing_top_skills:
            suggestions.append(f"Add key skills: {', '.join(missing_top_skills)}")
    
    if semantic_score < 60:
        suggestions.append("Tailor experience descriptions to match job responsibilities")
    elif semantic_score < 75:
        suggestions.append("Enhance project descriptions with specific achievements and metrics")
    
    if len(resume_tokens) < max(150, len(jd_tokens) // 2):
        suggestions.append("Expand experience and project descriptions")
    
    if keyword_score < 50 and missing_keywords:
        suggestions.append("Include more industry-specific terminology from the job description")
    
    if not suggestions:
        suggestions.append("Strong match - consider applying!")

    seen = set()
    deduped_suggestions: list[str] = []
    for s in suggestions:
        if s not in seen:
            deduped_suggestions.append(s)
            seen.add(s)

    return {
        "ats_score": round(float(ats_score), 2),
        "keyword_score": round(float(keyword_score), 2),
        "semantic_score": round(float(semantic_score), 2),
        "skill_score": round(float(skill_score), 2),
        "matched_keywords": matched_keywords,
        "missing_keywords": missing_keywords,
        "important_skills_detected": important_skills_detected,
        "formatting_issues": formatting_issues,
        "resume_source": resume_source,
        "jd_source": jd_source,
        "suggestions": deduped_suggestions,
    }
