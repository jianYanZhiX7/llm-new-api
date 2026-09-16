package common

import (
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
)

const ContextKeyUpstreamMeta = "relay_detail_upstream_meta"

type UpstreamMeta struct {
	Attempt         int         `json:"attempt"`
	Method          string      `json:"method,omitempty"`
	URL             string      `json:"url,omitempty"`
	Model           string      `json:"model,omitempty"`
	StatusCode      int         `json:"status_code"`
	Error           string      `json:"error,omitempty"`
	RequestHeaders  http.Header `json:"request_headers,omitempty"`
	ResponseHeaders http.Header `json:"response_headers,omitempty"`
}

type upstreamMetaList struct {
	mu    sync.Mutex
	metas []UpstreamMeta
}

// AppendUpstreamMeta 追加一次上游调用记录（含重试），按调用顺序累积。
func AppendUpstreamMeta(c *gin.Context, m UpstreamMeta) {
	if c == nil {
		return
	}
	list := getOrCreateUpstreamMetaList(c)
	list.mu.Lock()
	list.metas = append(list.metas, m)
	list.mu.Unlock()
}

// GetUpstreamMeta 返回按调用顺序排列的上游调用记录，无记录时返回 nil。
func GetUpstreamMeta(c *gin.Context) []UpstreamMeta {
	if c == nil {
		return nil
	}
	value, ok := c.Get(ContextKeyUpstreamMeta)
	if !ok {
		return nil
	}
	list, ok := value.(*upstreamMetaList)
	if !ok {
		return nil
	}
	list.mu.Lock()
	defer list.mu.Unlock()
	if len(list.metas) == 0 {
		return nil
	}
	cp := make([]UpstreamMeta, len(list.metas))
	copy(cp, list.metas)
	return cp
}

func getOrCreateUpstreamMetaList(c *gin.Context) *upstreamMetaList {
	if value, ok := c.Get(ContextKeyUpstreamMeta); ok {
		if list, ok := value.(*upstreamMetaList); ok {
			return list
		}
	}
	list := &upstreamMetaList{}
	c.Set(ContextKeyUpstreamMeta, list)
	return list
}
