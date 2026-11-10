#!/usr/bin/env python3
"""Build istories story files from the course data modules.

Each output file follows the schema of systeme-prompt/exemple.js:
  window.storiesData = { stories: [...], dictionary: {...} }
"""
import json
import os
import re
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE, "output")
sys.path.insert(0, os.path.join(BASE, "course_data"))

DICT_PATH = "../../database/Dictionarys/shared.json"
AUTHOR = "The American English"

# Playlist order from input/links.txt (yt-dlp --flat-playlist).
VIDEOS = {
    "writing": [
        "B8xjIRrlDuk", "VJWfTbUEUhA", "V-1rQdUcipE", "fAy1pJwUOYU",
        "EYZt-FW2EWo", "U6hZux-rH1E", "9qnkQni1oJE", "sH2OeC8IyvM",
        "O8SOljmd3d0", "APyGqbRs7x8", "xGHqH_zS4Rw", "EOE3lBV1J1U",
    ],
    "conversation": [
        "82a1udwePtk", "v7S1q845FMk", "XGUi081D_xk", "JDgnAh9WtNQ",
        "TrKt19UuJJc", "8zjKLXCNr3Q", "obiiXJ5vhes", "9La3dZ0ZCLI",
        "zTSv5DIKhB8",
    ],
    "phonetics": [
        "804e5iDYzSc", "DTZAQ9B1yIU", "ac0rDm-G2wM", "Lc7tVqD1Xl4",
        "Shn-VnocabE", "AH5S0i3PJ00", "fDD0qKMw1iQ", "JuMgujNb4sI",
        "bnu4lt5g5RU", "Gc17j2Jj46Y", "zbKiMyIYQP8", "HYy3zN4JN3Q",
        "T5CWmfET7vY", "R_lxkkzyUqw",
    ],
    "reading": [
        "69aLCcVsrnw", "_44mTsUG-b0", "re_t-HmysYo", "eN2jB_PtLS4",
        "I2STyfx9jb0", "c8-DFcA2_r0", "U0IUBBvtm8A", "XYK6ZqJdoos",
        "kC0u-nh3W-w", "pUOqVHUPcMU", "4eS0uJpzqTY", "AWji0pq48dU",
        "VKGfhTvi7Rk", "1YfWceaipe4", "1cM6cQAZ2BE", "nSIn4WSpTXA",
        "MLCFcTOt3Ic",
    ],
    "grammar": [
        "26qCP6YLfiA", "wes9C0ZT6gQ", "Q8gMUILX6xk", "7vhocM2c54I",
        "Q1Vv-L47xh8", "ssp4xahm824", "oSNLR7zep_E", "lLuBnyzSr4M",
        "GlbaB-gzXrw", "_eeFz69Z3JE", "pULndA3TeWw", "kRg0eI-ztrE",
        "PRp7qezu02A", "YQO2OTxlBXA", "7_-J6-zNYF0", "BxbwjdiicEg",
        "ihZL-u768R0", "l5i3WUbAuzs", "8Dr6xb2rh5w", "2qceNc2222g",
        "UnlxToin8Qc", "ZSPEXLH11fk", "nyP4uJEZPAI", "METPqSbqeCc",
        "r-PvBZSimRU", "f9TGKc_8Wfc",
    ],
}

COURSE_TITLES = {
    "writing": "Writing Course - Level 1",
    "conversation": "Conversation Course - Level 1",
    "phonetics": "Phonics Course - Level 1",
    "reading": "Reading Course - Level 1",
    "grammar": "Grammar Course - Level 1",
    "writing_summary": "Writing Course - Level 1 Summary",
    "conversation_summary": "Conversation Course - Level 1 Summary",
}

NO_MARK = {
    "a", "an", "the", "is", "am", "are", "was", "were", "be", "do", "does",
    "did", "to", "of", "in", "on", "at", "and", "or", "but", "i", "you",
    "he", "she", "it", "we", "they", "my", "your", "his", "her", "its",
    "our", "their", "this", "that", "these", "those",
}


def mark_words(text, vocab):
    """Wrap vocabulary words/phrases in <span class='mark'>...</span>."""
    keys = [k for k in vocab if k.lower() not in NO_MARK and len(k) > 1]
    if not keys:
        return text
    keys.sort(key=len, reverse=True)
    pattern = re.compile(
        r"(?<![\w-])(" + "|".join(re.escape(k) for k in keys) + r")(?![\w-])",
        re.IGNORECASE,
    )
    return pattern.sub(lambda m: f"<span class='mark'>{m.group(0)}</span>", text)


def word_count(content):
    return sum(len(re.sub(r"<[^>]+>", "", s).split()) for s in content)


def iframe(vid, title):
    return (
        f'<iframe width="560" height="315" '
        f'src="https://www.youtube.com/embed/{vid}?rel=0" '
        f'title="{title}" frameborder="0" '
        f'allow="accelerometer; autoplay; clipboard-write; encrypted-media; '
        f'gyroscope; picture-in-picture; web-share" '
        f'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
    )


def build_course(course_key, lessons, out_name, video_course=None, dictionary_desc=None):
    video_course = video_course or course_key
    stories = []
    dictionary = {}

    for idx, lesson in enumerate(lessons, start=1):
        vid = VIDEOS[video_course][lesson.get("video", idx) - 1]
        title = lesson["title"]
        topic_en = lesson.get("topic_en", title.split(": ", 1)[-1])
        topic_ar = lesson.get("topic_ar", "")
        vocab = lesson.get("vocab", {})

        content = [mark_words(s, vocab) for s in lesson["content"]]
        translations = [t for t in lesson["tr"]]
        assert len(content) == len(translations), (
            f"{out_name} {title}: content/tr length mismatch "
            f"({len(content)} vs {len(translations)})"
        )

        desc = lesson.get("desc", "")
        full_desc = f"{desc} {iframe(vid, title)}".strip()

        story = {
            "lang": "en",
            "title": title,
            "description": full_desc,
            "level": lesson.get("level", "beginner"),
            "levelcefr": lesson.get("levelcefr", "A1"),
            "cover": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
            "coverType": "image",
            "author": AUTHOR,
            "tags": ["course", "level 1", topic_en.lower(), topic_ar],
            "content": content,
            "content-tr": translations,
            "translations": vocab,
            "wordCount": word_count(content),
            "dictionaries": [DICT_PATH],
        }
        stories.append(story)
        for k, v in vocab.items():
            dictionary[k] = v

    dict_obj = {
        "$schema": "istories-shared-dictionary",
        "version": 1,
        "description": dictionary_desc or f"Vocabulary from {COURSE_TITLES[course_key]}",
        "defaultLanguage": "en",
        "languages": {
            "en": {
                k: {"translation": dictionary[k]}
                for k in sorted(dictionary, key=lambda s: s.lower())
            }
        },
        "phrases": {"en": {}},
    }

    data = {"stories": stories, "dictionary": dict_obj}

    header = (
        f"// {COURSE_TITLES[course_key]} - {len(stories)} lessons converted into stories.\n"
        f"// Each story: \"content\" (English sentences, key words marked), "
        f"\"content-tr\" (Arabic translation per sentence),\n"
        f"// \"translations\" (lesson vocabulary), \"description\" (reader Description tab text + the lesson\n"
        f"// YouTube iframe) and a YouTube thumbnail cover - plus an embedded dictionary of all lesson words.\n\n"
    )
    body = json.dumps(data, ensure_ascii=False, indent=2)
    path = os.path.join(OUT_DIR, out_name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(header)
        f.write("window.storiesData = ")
        f.write(body)
        f.write(";\n")
    print(f"wrote {path} ({len(stories)} lessons, {len(dictionary)} words)")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    import reading
    import conversation
    import writing
    import phonetics
    import grammar
    import writing_summary
    import conversation_summary

    build_course("reading", reading.LESSONS, "reading-level1.js")
    build_course("conversation", conversation.LESSONS, "conversation-level1.js")
    build_course("writing", writing.LESSONS, "writing-level1.js")
    build_course("phonetics", phonetics.LESSONS, "phonetics-level1.js")
    build_course("grammar", grammar.LESSONS, "grammar-level1.js")
    build_course(
        "writing_summary", writing_summary.LESSONS,
        "writing-level1-summary.js", video_course="writing",
    )
    build_course(
        "conversation_summary", conversation_summary.LESSONS,
        "conversation-level1-summary.js", video_course="conversation",
    )


if __name__ == "__main__":
    main()
