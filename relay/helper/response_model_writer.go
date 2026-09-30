package helper

import (
	"github.com/QuantumNous/new-api/common"

	"github.com/gin-gonic/gin"
)

type responseModelRewritingWriter struct {
	gin.ResponseWriter
	c *gin.Context
}

func (w *responseModelRewritingWriter) Write(payload []byte) (int, error) {
	target := common.ResponseModelRewriteTarget(w.c)
	if len(payload) == 0 || target == "" {
		return w.ResponseWriter.Write(payload)
	}
	rewritten := common.RewriteResponseModelName(payload, target)
	if _, err := w.ResponseWriter.Write(rewritten); err != nil {
		return 0, err
	}
	return len(payload), nil
}

func (w *responseModelRewritingWriter) WriteString(payload string) (int, error) {
	return w.Write([]byte(payload))
}

func installResponseModelRewriter(c *gin.Context) {
	if c == nil || c.Writer == nil {
		return
	}
	if _, ok := c.Writer.(*responseModelRewritingWriter); ok {
		return
	}
	c.Writer = &responseModelRewritingWriter{ResponseWriter: c.Writer, c: c}
}
