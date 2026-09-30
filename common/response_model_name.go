package common

import (
	"bytes"

	"github.com/QuantumNous/new-api/constant"

	"github.com/gin-gonic/gin"
)

const (
	responseModelField = "model"
	responseModelKey   = `"model"`
	sseDataPrefix      = "data:"
)

func SetResponseModelRewriteTarget(c *gin.Context, model string) {
	if c == nil {
		return
	}
	SetContextKey(c, constant.ContextKeyResponseModelName, model)
}

func ResponseModelRewriteTarget(c *gin.Context) string {
	if c == nil {
		return ""
	}
	target, _ := GetContextKeyType[string](c, constant.ContextKeyResponseModelName)
	return target
}

func RewriteResponseModelName(body []byte, model string) []byte {
	if model == "" || len(body) == 0 {
		return body
	}
	if !bytes.Contains(body, []byte(responseModelKey)) {
		return body
	}

	target := quotedJSONString(model)
	if len(target) == 0 {
		return body
	}
	return rewritePayload(body, target)
}

func quotedJSONString(value string) []byte {
	encoded, err := Marshal(value)
	if err != nil {
		return nil
	}
	return encoded
}

func rewritePayload(body []byte, target []byte) []byte {
	if bytes.IndexByte(body, '\n') < 0 {
		return rewriteLine(body, target)
	}

	rewrittenBody := make([]byte, 0, len(body))
	changed := false
	for _, line := range bytes.SplitAfter(body, []byte("\n")) {
		content, terminator := splitLineTerminator(line)
		rewrittenLine := rewriteLine(content, target)
		if !bytes.Equal(rewrittenLine, content) {
			changed = true
		}
		rewrittenBody = append(rewrittenBody, rewrittenLine...)
		rewrittenBody = append(rewrittenBody, terminator...)
	}
	if !changed {
		return body
	}
	return rewrittenBody
}

func splitLineTerminator(line []byte) ([]byte, []byte) {
	if bytes.HasSuffix(line, []byte("\r\n")) {
		return line[:len(line)-2], line[len(line)-2:]
	}
	if bytes.HasSuffix(line, []byte("\n")) {
		return line[:len(line)-1], line[len(line)-1:]
	}
	return line, nil
}

func rewriteLine(line []byte, target []byte) []byte {
	payloadStart := sseDataPayloadStart(line)
	if payloadStart < 0 {
		return rewriteModelValues(line, target)
	}
	return rewriteFrom(line, payloadStart, target)
}

func rewriteFrom(line []byte, payloadStart int, target []byte) []byte {
	rewritten := rewriteModelValues(line[payloadStart:], target)
	if bytes.Equal(rewritten, line[payloadStart:]) {
		return line
	}

	rewrittenLine := make([]byte, 0, payloadStart+len(rewritten))
	rewrittenLine = append(rewrittenLine, line[:payloadStart]...)
	return append(rewrittenLine, rewritten...)
}

func sseDataPayloadStart(line []byte) int {
	prefixEnd := 0
	for prefixEnd < len(line) && (line[prefixEnd] == ' ' || line[prefixEnd] == '\t') {
		prefixEnd++
	}
	if !bytes.HasPrefix(line[prefixEnd:], []byte(sseDataPrefix)) {
		return -1
	}

	payloadStart := prefixEnd + len(sseDataPrefix)
	for payloadStart < len(line) && line[payloadStart] == ' ' {
		payloadStart++
	}
	return payloadStart
}

func rewriteModelValues(payload []byte, target []byte) []byte {
	if !bytes.Contains(payload, []byte(responseModelKey)) {
		return payload
	}

	var rewritten []byte
	unflushed := 0
	changed := false
	for i := 0; i < len(payload); {
		if payload[i] != '"' {
			i++
			continue
		}

		tokenEnd := scanJSONString(payload, i)
		if tokenEnd < 0 {
			return payload
		}
		if !bytes.Equal(payload[i:tokenEnd], []byte(responseModelKey)) {
			i = tokenEnd
			continue
		}

		colon := skipJSONSpace(payload, tokenEnd)
		if colon >= len(payload) || payload[colon] != ':' {
			i = tokenEnd
			continue
		}

		valueStart := skipJSONSpace(payload, colon+1)
		if valueStart >= len(payload) || payload[valueStart] != '"' {
			i = tokenEnd
			continue
		}

		valueEnd := scanJSONString(payload, valueStart)
		if valueEnd < 0 {
			return payload
		}
		if bytes.Equal(payload[valueStart:valueEnd], target) {
			i = valueEnd
			continue
		}

		rewritten = append(rewritten, payload[unflushed:valueStart]...)
		rewritten = append(rewritten, target...)
		unflushed = valueEnd
		changed = true
		i = valueEnd
	}
	if !changed {
		return payload
	}
	return append(rewritten, payload[unflushed:]...)
}

func scanJSONString(payload []byte, start int) int {
	if start >= len(payload) || payload[start] != '"' {
		return -1
	}
	for i := start + 1; i < len(payload); i++ {
		switch payload[i] {
		case '\\':
			i++
		case '"':
			return i + 1
		}
	}
	return -1
}

func skipJSONSpace(payload []byte, start int) int {
	for start < len(payload) {
		switch payload[start] {
		case ' ', '\t', '\n', '\r':
			start++
		default:
			return start
		}
	}
	return start
}
