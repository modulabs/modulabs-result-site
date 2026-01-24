#!/bin/bash

# .claude 폴더 내의 markdown 파일 확인
if [ -f .claude/ralph-loop.local.md ]; then
    
    # completion_promise 값 추출 (따옴표 제거 로직 포함)
    PROMISE=$(grep '^completion_promise:' .claude/ralph-loop.local.md | sed 's/completion_promise: //' | sed 's/^"\(.*\)"$/\1/')
    
    # PROMISE 값이 존재하고 null이 아닐 경우 메시지 출력
    if [ -n "$PROMISE" ] && [ "$PROMISE" != "null" ]; then
        echo ""
        echo "═══════════════════════════════════════════════════════════"
        echo "CRITICAL - Ralph Loop Completion Promise"
        echo "═══════════════════════════════════════════════════════════"
        echo ""
        echo "To complete this loop, output this EXACT text:"
        echo "  $PROMISE"
        echo ""
        echo "STRICT REQUIREMENTS (DO NOT VIOLATE):"
        echo "  ✓ Use  XML tags EXACTLY as shown above"
        echo "  ✓ The statement MUST be completely and unequivocally TRUE"
        echo "  ✓ Do NOT output false statements to exit the loop"
        echo "  ✓ Do NOT lie even if you think you should exit"
        echo ""
        echo "IMPORTANT - Do not circumvent the loop:"
        echo "  Even if you believe you're stuck, the task is impossible,"
        echo "  or you've been running too long - you MUST NOT output a"
        echo "  false promise statement. The loop is designed to continue"
        echo "  until the promise is GENUINELY TRUE. Trust the process."
        echo ""
        echo "  If the loop should stop, the promise statement will become"
        echo "  true naturally. Do not force it by lying."
        echo "═══════════════════════════════════════════════════════════"
    fi
fi
