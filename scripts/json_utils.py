import re


def extract_json_from_text(text):
    """Gemini 응답 텍스트에서 JSON 객체/배열 블록만 안전하게 추출합니다.

    기존 코드는 removeprefix("```json")/removesuffix("```")만 사용했기 때문에,
    모델이 응답 앞뒤에 안내 문구("다음은 결과입니다:" 등)나 개행을 붙이면
    json.loads가 그대로 실패하여 브리핑 섹션이 통째로 비거나 실패 문구로
    덮어써지는 문제가 있었습니다. 여기서는 마크다운 펜스를 제거한 뒤,
    최초의 '{' 또는 '[' 부터 마지막 '}' 또는 ']' 까지만 잘라내어 파싱합니다.
    """
    if text is None:
        raise ValueError("빈 응답에서는 JSON을 추출할 수 없습니다.")

    cleaned = text.strip()
    cleaned = re.sub(r'^```(?:json)?', '', cleaned).strip()
    cleaned = re.sub(r'```$', '', cleaned).strip()

    start_candidates = [i for i in (cleaned.find('{'), cleaned.find('[')) if i != -1]
    if not start_candidates:
        raise ValueError(f"응답에서 JSON 시작 문자를 찾을 수 없습니다: {cleaned[:200]!r}")
    start = min(start_candidates)

    end_candidates = [i for i in (cleaned.rfind('}'), cleaned.rfind(']')) if i != -1]
    end = max(end_candidates) if end_candidates else len(cleaned) - 1

    return cleaned[start:end + 1]


def trim_to_length(text, max_chars=220):
    """AI가 글자수 제한 지시를 무시하고 너무 길게 답하는 경우를 대비해,
    문장 경계(마침표/느낌표/물음표) 기준으로 자연스럽게 잘라냅니다."""
    if not text or len(text) <= max_chars:
        return text

    truncated = text[:max_chars]
    last_boundary = max(truncated.rfind('.'), truncated.rfind('!'), truncated.rfind('?'))
    if last_boundary >= max_chars * 0.5:
        return truncated[:last_boundary + 1]
    return truncated.rstrip() + "…"
