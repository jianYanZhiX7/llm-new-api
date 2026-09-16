package middleware

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/logger"

	"github.com/gin-gonic/gin"
)

const (
	relayDetailLogEnvEnabled = "RELAY_DETAIL_LOG"
	relayDetailLogEnvDir     = "RELAY_DETAIL_LOG_DIR"
	relayDetailLogEnvMaxBody = "RELAY_DETAIL_LOG_MAX_BODY_BYTES"

	defaultRelayDetailLogDir  = "./relay_detail_logs"
	defaultRelayDetailMaxBody = 4 * 1024 * 1024
)

// relayDetailResponseWriter 包装 gin.ResponseWriter，将响应体复制到有上限的缓冲区，
// 供请求结束后落盘。其余方法（Flush/Hijack/Status 等）通过嵌入的 gin.ResponseWriter 委托。
type relayDetailResponseWriter struct {
	gin.ResponseWriter
	mu        sync.Mutex
	body      bytes.Buffer
	maxSize   int
	truncated bool
}

func (w *relayDetailResponseWriter) Write(b []byte) (int, error) {
	w.mu.Lock()
	if len(b) > 0 && !w.truncated {
		remain := w.maxSize - w.body.Len()
		if remain <= 0 {
			w.truncated = true
		} else if remain >= len(b) {
			w.body.Write(b)
		} else {
			w.body.Write(b[:remain])
			w.truncated = true
		}
	}
	w.mu.Unlock()
	return w.ResponseWriter.Write(b)
}

func (w *relayDetailResponseWriter) WriteString(s string) (int, error) {
	return w.Write([]byte(s))
}

func (w *relayDetailResponseWriter) snapshot() ([]byte, bool) {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.body.Bytes(), w.truncated
}

type relayDetailUser struct {
	Id       int    `json:"id,omitempty"`
	Username string `json:"username,omitempty"`
	TokenId  int    `json:"token_id,omitempty"`
	Group    string `json:"group,omitempty"`
}

type relayDetailChannel struct {
	Id      int    `json:"id,omitempty"`
	Name    string `json:"name,omitempty"`
	Type    int    `json:"type,omitempty"`
	BaseUrl string `json:"base_url,omitempty"`
	ApiKey  string `json:"api_key,omitempty"`
}

type relayDetailRecord struct {
	CapturedAt        time.Time             `json:"captured_at"`
	RequestId         string                `json:"request_id,omitempty"`
	UpstreamRequestId string                `json:"upstream_request_id,omitempty"`
	StartTime         int64                 `json:"start_time,omitempty"`
	DurationMs        int64                 `json:"duration_ms"`
	Method            string                `json:"method"`
	Path              string                `json:"path"`
	Query             string                `json:"query,omitempty"`
	ClientIp          string                `json:"client_ip,omitempty"`
	Status            int                   `json:"status"`
	IsStream          bool                  `json:"is_stream"`
	User              *relayDetailUser      `json:"user,omitempty"`
	Channel           *relayDetailChannel   `json:"channel,omitempty"`
	RequestedModel    string                `json:"requested_model,omitempty"`
	RequestHeaders    http.Header           `json:"request_headers,omitempty"`
	RequestBody       string                `json:"request_body,omitempty"`
	RequestBodyEnc    string                `json:"request_body_encoding,omitempty"`
	RequestTruncated  bool                  `json:"request_truncated,omitempty"`
	ResponseHeaders   http.Header           `json:"response_headers,omitempty"`
	ResponseBody      string                `json:"response_body,omitempty"`
	ResponseBodyEnc   string                `json:"response_body_encoding,omitempty"`
	ResponseTruncated bool                  `json:"response_truncated,omitempty"`
	UpstreamAttempts  []common.UpstreamMeta `json:"upstream_attempts,omitempty"`
}

type relayDetailRecorder struct {
	start            time.Time
	maxBody          int
	requestBody      string
	requestBodyEnc   string
	requestTruncated bool
	writer           *relayDetailResponseWriter
}

// RelayDetailLog 捕获转发请求/响应的完整信息并落盘到文件。
// 默认关闭（RELAY_DETAIL_LOG=false），关闭时仅一次环境变量判断，无额外开销。
func RelayDetailLog() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !common.GetEnvOrDefaultBool(relayDetailLogEnvEnabled, false) {
			c.Next()
			return
		}
		rec := beginRelayDetailLog(c)
		c.Next()
		finishRelayDetailLog(c, rec)
	}
}

func beginRelayDetailLog(c *gin.Context) *relayDetailRecorder {
	maxBody := common.GetEnvOrDefault(relayDetailLogEnvMaxBody, defaultRelayDetailMaxBody)
	if maxBody <= 0 {
		maxBody = defaultRelayDetailMaxBody
	}
	rec := &relayDetailRecorder{start: time.Now(), maxBody: maxBody}

	if storage, err := common.GetBodyStorage(c); err == nil {
		if reader, rErr := storage.NewReader(); rErr == nil {
			body, truncated := readBounded(reader, maxBody)
			_ = reader.Close()
			rec.requestBody, rec.requestBodyEnc = encodePayload(body)
			rec.requestTruncated = truncated
		}
	}

	rec.writer = &relayDetailResponseWriter{ResponseWriter: c.Writer, maxSize: maxBody}
	c.Writer = rec.writer
	return rec
}

func finishRelayDetailLog(c *gin.Context, rec *relayDetailRecorder) {
	if rec == nil || rec.writer == nil {
		return
	}
	responseBody, responseTruncated := rec.writer.snapshot()
	responseBodyStr, responseBodyEnc := encodePayload(responseBody)

	isStream := common.GetContextKeyBool(c, constant.ContextKeyIsStream)
	if !isStream {
		isStream = strings.Contains(rec.writer.Header().Get("Content-Type"), "text/event-stream")
	}

	startTime := c.GetTime(string(constant.ContextKeyRequestStartTime))
	var startUnix int64
	if !startTime.IsZero() {
		startUnix = startTime.Unix()
	}

	record := &relayDetailRecord{
		CapturedAt:        time.Now(),
		RequestId:         c.GetString(common.RequestIdKey),
		UpstreamRequestId: c.GetString(common.UpstreamRequestIdKey),
		StartTime:         startUnix,
		DurationMs:        time.Since(rec.start).Milliseconds(),
		Method:            c.Request.Method,
		Path:              c.Request.URL.Path,
		Query:             c.Request.URL.RawQuery,
		ClientIp:          c.ClientIP(),
		Status:            rec.writer.Status(),
		IsStream:          isStream,
		User: &relayDetailUser{
			Id:       common.GetContextKeyInt(c, constant.ContextKeyUserId),
			Username: common.GetContextKeyString(c, constant.ContextKeyUserName),
			TokenId:  common.GetContextKeyInt(c, constant.ContextKeyTokenId),
			Group:    common.GetContextKeyString(c, constant.ContextKeyUsingGroup),
		},
		Channel: &relayDetailChannel{
			Id:      common.GetContextKeyInt(c, constant.ContextKeyChannelId),
			Name:    common.GetContextKeyString(c, constant.ContextKeyChannelName),
			Type:    common.GetContextKeyInt(c, constant.ContextKeyChannelType),
			BaseUrl: common.GetContextKeyString(c, constant.ContextKeyChannelBaseUrl),
			ApiKey:  common.GetContextKeyString(c, constant.ContextKeyChannelKey),
		},
		RequestedModel:    common.GetContextKeyString(c, constant.ContextKeyOriginalModel),
		RequestHeaders:    c.Request.Header.Clone(),
		RequestBody:       rec.requestBody,
		RequestBodyEnc:    rec.requestBodyEnc,
		RequestTruncated:  rec.requestTruncated,
		ResponseHeaders:   rec.writer.Header().Clone(),
		ResponseBody:      responseBodyStr,
		ResponseBodyEnc:   responseBodyEnc,
		ResponseTruncated: responseTruncated,
		UpstreamAttempts:  common.GetUpstreamMeta(c),
	}

	writeRelayDetailLogFile(c, record)
}

func writeRelayDetailLogFile(c *gin.Context, record *relayDetailRecord) {
	data, err := common.Marshal(record)
	if err != nil {
		logger.LogWarn(c, "relay detail log marshal failed: "+err.Error())
		return
	}
	dayDir := filepath.Join(common.GetEnvOrDefaultString(relayDetailLogEnvDir, defaultRelayDetailLogDir), record.CapturedAt.Format("2006-01-02"))
	if err = os.MkdirAll(dayDir, 0o700); err != nil {
		logger.LogWarn(c, "relay detail log mkdir failed: "+err.Error())
		return
	}
	requestId := relayDetailSlug(record.RequestId)
	name := fmt.Sprintf("%s_%s_%d_%s.json",
		record.CapturedAt.Format("150405.000"),
		requestId,
		record.Status,
		relayDetailSlug(record.Path))
	filename := filepath.Join(dayDir, name)
	if err = os.WriteFile(filename, data, 0o600); err != nil {
		logger.LogWarn(c, "relay detail log write failed: "+err.Error())
		return
	}
	logger.LogDebug(c, "relay detail log written: "+filename)
}

func readBounded(reader io.Reader, max int) ([]byte, bool) {
	data, err := io.ReadAll(io.LimitReader(reader, int64(max)+1))
	if err != nil {
		return data, false
	}
	if len(data) > max {
		return data[:max], true
	}
	return data, false
}

func encodePayload(b []byte) (string, string) {
	if utf8.Valid(b) {
		return string(b), ""
	}
	return base64.StdEncoding.EncodeToString(b), "base64"
}

func relayDetailSlug(s string) string {
	var builder strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			builder.WriteRune(r)
		} else {
			builder.WriteRune('_')
		}
	}
	out := strings.Trim(builder.String(), "_")
	if out == "" {
		return "request"
	}
	return out
}
