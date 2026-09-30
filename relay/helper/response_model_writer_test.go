package helper

import (
	"io"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResponseModelRewriterRewritesBody(t *testing.T) {
	c, recorder := newResponseModelTestContext()
	common.SetResponseModelRewriteTarget(c, "deepseek-chat")
	installResponseModelRewriter(c)

	payload := `{"id":"chatcmpl-1","model":"deepseek-v4"}`
	written, err := c.Writer.Write([]byte(payload))
	require.NoError(t, err)
	assert.Equal(t, len(payload), written, "callers must observe a full write")
	assert.Equal(t, `{"id":"chatcmpl-1","model":"deepseek-chat"}`, recorder.Body.String())
}

func TestResponseModelRewriterRewritesStreamEvents(t *testing.T) {
	c, recorder := newResponseModelTestContext()
	common.SetResponseModelRewriteTarget(c, "deepseek-chat")
	installResponseModelRewriter(c)

	event := "data: {\"model\":\"deepseek-v4\",\"choices\":[]}\n\n"
	_, err := c.Writer.WriteString(event)
	require.NoError(t, err)

	written := recorder.Body.String()
	require.True(t, strings.HasPrefix(written, "data: ") && strings.HasSuffix(written, "\n\n"), "sse framing lost: %q", written)
	payload := strings.TrimSuffix(strings.TrimPrefix(written, "data: "), "\n\n")
	var decoded struct {
		Model string `json:"model"`
	}
	require.NoError(t, common.Unmarshal([]byte(payload), &decoded))
	assert.Equal(t, "deepseek-chat", decoded.Model)
}

func TestResponseModelRewriterKeepsPayloadWithoutTarget(t *testing.T) {
	c, recorder := newResponseModelTestContext()
	installResponseModelRewriter(c)

	payload := `{"model":"deepseek-v4"}`
	_, err := c.Writer.Write([]byte(payload))
	require.NoError(t, err)
	assert.Equal(t, payload, recorder.Body.String())
}

func TestResponseModelRewriterKeepsCopyContract(t *testing.T) {
	c, recorder := newResponseModelTestContext()
	common.SetResponseModelRewriteTarget(c, "deepseek-chat")
	installResponseModelRewriter(c)

	payload := `{"model":"deepseek-v4"}`
	copied, err := io.Copy(c.Writer, strings.NewReader(payload))
	require.NoError(t, err)
	assert.Equal(t, int64(len(payload)), copied)
	assert.Equal(t, `{"model":"deepseek-chat"}`, recorder.Body.String())
}

func TestResponseModelRewriterInstallsOnce(t *testing.T) {
	c, _ := newResponseModelTestContext()
	installResponseModelRewriter(c)
	first := c.Writer
	installResponseModelRewriter(c)
	assert.Same(t, first, c.Writer)
}
