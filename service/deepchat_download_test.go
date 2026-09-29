package service

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func writeDeepChatPackageJSON(t *testing.T, dir, content string) string {
	t.Helper()
	path := filepath.Join(dir, "package.json")
	require.NoError(t, os.WriteFile(path, []byte(content), 0o644))
	return path
}

func useDeepChatPackageJSON(t *testing.T, path string) {
	t.Helper()
	previousPath := common.DeepChatPackageJSONPath
	deepChatVersion.mu.Lock()
	previousVersion, previousModTime, previousSize := deepChatVersion.version, deepChatVersion.modTime, deepChatVersion.size
	deepChatVersion.version, deepChatVersion.modTime, deepChatVersion.size = "", time.Time{}, 0
	deepChatVersion.mu.Unlock()
	common.DeepChatPackageJSONPath = path
	t.Cleanup(func() {
		common.DeepChatPackageJSONPath = previousPath
		deepChatVersion.mu.Lock()
		deepChatVersion.version, deepChatVersion.modTime, deepChatVersion.size = previousVersion, previousModTime, previousSize
		deepChatVersion.mu.Unlock()
	})
}

func TestGetDeepChatVersion(t *testing.T) {
	cases := []struct {
		name    string
		content string
		want    string
		wantErr bool
	}{
		{name: "valid version", content: `{"name":"deepchat","version":"1.1.0-beta.11"}`, want: "1.1.0-beta.11"},
		{name: "malformed json", content: `{"version":`, wantErr: true},
		{name: "empty version", content: `{"version":""}`, wantErr: true},
		{name: "missing version field", content: `{"name":"deepchat"}`, wantErr: true},
		{name: "not an object", content: `"1.1.0"`, wantErr: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			path := writeDeepChatPackageJSON(t, t.TempDir(), tc.content)
			useDeepChatPackageJSON(t, path)
			version, err := GetDeepChatVersion()
			if tc.wantErr {
				require.Error(t, err)
				assert.Empty(t, version)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.want, version)
		})
	}
}

func TestGetDeepChatVersionMissingFile(t *testing.T) {
	useDeepChatPackageJSON(t, filepath.Join(t.TempDir(), "package.json"))
	version, err := GetDeepChatVersion()
	require.Error(t, err)
	assert.Empty(t, version)
}

func TestGetDeepChatVersionCachesUntilFileChanges(t *testing.T) {
	dir := t.TempDir()
	path := writeDeepChatPackageJSON(t, dir, `{"version":"1.0.0"}`)
	useDeepChatPackageJSON(t, path)
	info, err := os.Stat(path)
	require.NoError(t, err)

	version, err := GetDeepChatVersion()
	require.NoError(t, err)
	require.Equal(t, "1.0.0", version)

	// Same size and restored mtime: the cache must serve the previously parsed value.
	require.NoError(t, os.WriteFile(path, []byte(`{"version":"9.9.9"}`), 0o644))
	require.NoError(t, os.Chtimes(path, info.ModTime(), info.ModTime()))
	version, err = GetDeepChatVersion()
	require.NoError(t, err)
	assert.Equal(t, "1.0.0", version)

	// A newer mtime invalidates the cache without a process restart.
	require.NoError(t, os.Chtimes(path, info.ModTime().Add(time.Second), info.ModTime().Add(time.Second)))
	version, err = GetDeepChatVersion()
	require.NoError(t, err)
	assert.Equal(t, "9.9.9", version)
}

func TestDeepChatObjectKey(t *testing.T) {
	path := writeDeepChatPackageJSON(t, t.TempDir(), `{"version":"1.1.0-beta.11"}`)
	useDeepChatPackageJSON(t, path)
	cases := []struct {
		platform string
		want     string
		wantOK   bool
	}{
		{platform: "windows-x64", want: "DeepChat-1.1.0-beta.11-windows-x64.exe", wantOK: true},
		{platform: "mac-arm64", want: "DeepChat-1.1.0-beta.11-mac-arm64.dmg", wantOK: true},
		{platform: "macos-arm64", want: "DeepChat-1.1.0-beta.11-mac-arm64.dmg", wantOK: true},
		{platform: "linux-appimage", want: "DeepChat-1.1.0-beta.11-linux-x86_64.AppImage", wantOK: true},
		{platform: "", wantOK: false},
		{platform: "windows", wantOK: false},
		{platform: "../secret", wantOK: false},
		{platform: "DeepChat-1.1.0-beta.11-windows-x64.exe", wantOK: false},
	}
	for _, tc := range cases {
		t.Run(tc.platform, func(t *testing.T) {
			key, ok := DeepChatObjectKey(tc.platform)
			assert.Equal(t, tc.wantOK, ok)
			assert.Equal(t, tc.want, key)
		})
	}
}

func TestDeepChatObjectKeyWithoutVersion(t *testing.T) {
	useDeepChatPackageJSON(t, filepath.Join(t.TempDir(), "package.json"))
	key, ok := DeepChatObjectKey("windows-x64")
	assert.False(t, ok)
	assert.Empty(t, key)
}
