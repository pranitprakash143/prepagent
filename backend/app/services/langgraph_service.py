from app.services.agents.ingestion_agent import build_ingestion_agent
from app.services.agents.flashcard_agent import build_flashcard_agent
from app.services.agents.quiz_agent import build_quiz_agent
from app.services.agents.gap_agent import build_gap_agent
from app.services.agents.socratic_agent import build_socratic_agent

ingestion_agent = build_ingestion_agent()
flashcard_agent = build_flashcard_agent()
quiz_agent = build_quiz_agent()
gap_agent = build_gap_agent()
socratic_agent = build_socratic_agent()
