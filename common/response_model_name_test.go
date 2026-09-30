package common

import "testing"

func TestRewriteResponseModelName(t *testing.T) {
	body := []byte(`{"id":"chatcmpl-1","model":"deepseek-v4","created":1730000000,"usage":{"prompt_tokens":11,"completion_tokens":22,"total_tokens":33}}`)
	got := RewriteResponseModelName(body, "deepseek-chat")
	want := `{"id":"chatcmpl-1","model":"deepseek-chat","created":1730000000,"usage":{"prompt_tokens":11,"completion_tokens":22,"total_tokens":33}}`
	if string(got) != want {
		t.Fatalf("rewrite top level model: got %s want %s", got, want)
	}
}

func TestRewriteResponseModelNameKeepsNumericFidelity(t *testing.T) {
	body := []byte(`{"model":"deepseek-v4","id":12345678901234567890,"usage":{"total_tokens":1}}`)
	got := RewriteResponseModelName(body, "deepseek-chat")
	want := `{"model":"deepseek-chat","id":12345678901234567890,"usage":{"total_tokens":1}}`
	if string(got) != want {
		t.Fatalf("numeric fidelity lost: got %s want %s", got, want)
	}
}

func TestRewriteResponseModelNameKeepsLiteralBytes(t *testing.T) {
	body := []byte(`{"model":"deepseek-v4","note":"a<b & c>d \u00e9"}`)
	got := RewriteResponseModelName(body, "deepseek-chat")
	want := `{"model":"deepseek-chat","note":"a<b & c>d \u00e9"}`
	if string(got) != want {
		t.Fatalf("literal bytes changed: got %s want %s", got, want)
	}
}

func TestRewriteResponseModelNameNested(t *testing.T) {
	body := []byte(`{"type":"message_start","message":{"id":"msg_1","model":"deepseek-v4"}}`)
	got := RewriteResponseModelName(body, "deepseek-chat")
	want := `{"type":"message_start","message":{"id":"msg_1","model":"deepseek-chat"}}`
	if string(got) != want {
		t.Fatalf("rewrite nested model: got %s want %s", got, want)
	}
}

func TestRewriteResponseModelNameNestedInArray(t *testing.T) {
	body := []byte(`{"data":[{"model":"deepseek-v4"},{"model":"deepseek-v4"}]}`)
	got := RewriteResponseModelName(body, "deepseek-chat")
	want := `{"data":[{"model":"deepseek-chat"},{"model":"deepseek-chat"}]}`
	if string(got) != want {
		t.Fatalf("rewrite model in array: got %s want %s", got, want)
	}
}

func TestRewriteResponseModelNameIgnoresModelAsValue(t *testing.T) {
	body := []byte(`{"a":"model","model":"deepseek-v4","b":{"c":"model"}}`)
	got := RewriteResponseModelName(body, "deepseek-chat")
	want := `{"a":"model","model":"deepseek-chat","b":{"c":"model"}}`
	if string(got) != want {
		t.Fatalf("non-key model string changed: got %s want %s", got, want)
	}
}

func TestRewriteResponseModelNameIgnoresNonStringModel(t *testing.T) {
	body := []byte(`{"model":123,"other":"deepseek-v4"}`)
	got := RewriteResponseModelName(body, "deepseek-chat")
	if string(got) != string(body) {
		t.Fatalf("non-string model value changed: got %s", got)
	}
}

func TestRewriteResponseModelNameToleratesKeySpacing(t *testing.T) {
	body := []byte("{\"model\" \t:  \"deepseek-v4\"}")
	got := RewriteResponseModelName(body, "deepseek-chat")
	want := "{\"model\" \t:  \"deepseek-chat\"}"
	if string(got) != want {
		t.Fatalf("spaced key not rewritten: got %s want %s", got, want)
	}
}

func TestRewriteResponseModelNameEscapesTarget(t *testing.T) {
	body := []byte(`{"model":"deepseek-v4"}`)
	got := RewriteResponseModelName(body, `say "hi"`)
	want := `{"model":"say \"hi\""}`
	if string(got) != want {
		t.Fatalf("target not escaped: got %s want %s", got, want)
	}
}

func TestRewriteResponseModelNameSSEFrame(t *testing.T) {
	body := []byte("data: {\"model\":\"deepseek-v4\",\"choices\":[]}\n\n")
	got := RewriteResponseModelName(body, "deepseek-chat")
	assertSSEModel(t, got, "deepseek-chat", "data: ", "\n\n")
}

func TestRewriteResponseModelNameSSEFrameWithoutTrailingNewline(t *testing.T) {
	body := []byte("data: {\"model\":\"deepseek-v4\"}")
	got := RewriteResponseModelName(body, "deepseek-chat")
	assertSSEModel(t, got, "deepseek-chat", "data: ", "")
}

func TestRewriteResponseModelNameSSEFrameWithCRLF(t *testing.T) {
	body := []byte("data: {\"model\":\"deepseek-v4\"}\r\n\r\n")
	got := RewriteResponseModelName(body, "deepseek-chat")
	assertSSEModel(t, got, "deepseek-chat", "data: ", "\r\n\r\n")
}

func assertSSEModel(t *testing.T, body []byte, model string, prefix string, suffix string) {
	t.Helper()
	text := string(body)
	if len(text) < len(prefix)+len(suffix) || text[:len(prefix)] != prefix || text[len(text)-len(suffix):] != suffix {
		t.Fatalf("sse framing lost: got %q", text)
	}
	payload := text[len(prefix) : len(text)-len(suffix)]
	var decoded struct {
		Model string `json:"model"`
	}
	if err := Unmarshal([]byte(payload), &decoded); err != nil {
		t.Fatalf("unmarshal sse payload %q: %v", payload, err)
	}
	if decoded.Model != model {
		t.Fatalf("sse payload model: got %q want %q", decoded.Model, model)
	}
}

func TestRewriteResponseModelNameKeepsSSEFraming(t *testing.T) {
	body := []byte("event: message_start\ndata: {\"message\":{\"model\":\"deepseek-v4\"}}\n\n: PING\n\ndata: [DONE]\n\n")
	got := RewriteResponseModelName(body, "deepseek-chat")
	want := "event: message_start\ndata: {\"message\":{\"model\":\"deepseek-chat\"}}\n\n: PING\n\ndata: [DONE]\n\n"
	if string(got) != want {
		t.Fatalf("sse framing lost: got %q want %q", got, want)
	}
}

func TestRewriteResponseModelNameKeepsUnchangedPayload(t *testing.T) {
	for _, body := range []string{
		`{"model":"deepseek-chat","created":1730000000}`,
		"data: {\"model\":\"deepseek-chat\"}\n\n",
		`{"message":{"model":"deepseek-chat"}}`,
	} {
		got := RewriteResponseModelName([]byte(body), "deepseek-chat")
		if string(got) != body {
			t.Fatalf("expected %q unchanged, got %q", body, got)
		}
	}
}

func TestRewriteResponseModelNameKeepsNonJSONPayload(t *testing.T) {
	for _, body := range []string{"[DONE]", "", "data: keep", `{"choices":[1,2]}`, "data: [DONE]\n\n", "//: keepalive\n\n"} {
		got := RewriteResponseModelName([]byte(body), "deepseek-chat")
		if string(got) != body {
			t.Fatalf("expected %q unchanged, got %q", body, got)
		}
	}
}

func TestRewriteResponseModelNameKeepsUnterminatedPayload(t *testing.T) {
	for _, body := range []string{`{"model":"unterminated`, `{"model":`, `{"model`} {
		got := RewriteResponseModelName([]byte(body), "deepseek-chat")
		if string(got) != body {
			t.Fatalf("expected truncated %q unchanged, got %q", body, got)
		}
	}
}

func TestRewriteResponseModelNameRewritesPartialFrames(t *testing.T) {
	body := []byte(`{"model":"deepseek-v4"`)
	got := RewriteResponseModelName(body, "deepseek-chat")
	want := `{"model":"deepseek-chat"`
	if string(got) != want {
		t.Fatalf("partial frame not rewritten: got %s want %s", got, want)
	}
}

func TestRewriteResponseModelNameIgnoresEmptyTarget(t *testing.T) {
	body := []byte(`{"model":"deepseek-v4"}`)
	if got := RewriteResponseModelName(body, ""); string(got) != string(body) {
		t.Fatalf("expected original payload for empty target, got %s", got)
	}
}
