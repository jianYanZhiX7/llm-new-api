package service

import (
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
)

const defaultDeepChatPackageJSONPath = "/home/cxy/projects/deepchat/package.json"

var deepChatObjectKeyTemplates = map[string]string{
	"windows-x64":    "DeepChat-%s-windows-x64.exe",
	"mac-arm64":      "DeepChat-%s-mac-arm64.dmg",
	"macos-arm64":    "DeepChat-%s-mac-arm64.dmg",
	"linux-appimage": "DeepChat-%s-linux-x86_64.AppImage",
}

type deepChatVersionCache struct {
	mu      sync.Mutex
	version string
	modTime time.Time
	size    int64
}

var (
	deepChatVersion      deepChatVersionCache
	deepChatDefaultPath  sync.Once
	deepChatVersionLogMu sync.Mutex
	deepChatVersionState string
)

func deepChatPackageJSONPath() string {
	if common.DeepChatPackageJSONPath != "" {
		return common.DeepChatPackageJSONPath
	}
	deepChatDefaultPath.Do(func() {
		common.SysLog(fmt.Sprintf(
			"DEEPCHAT_PACKAGE_JSON_PATH is unset, falling back to %s, set it explicitly if this path does not exist on this host",
			defaultDeepChatPackageJSONPath))
	})
	return defaultDeepChatPackageJSONPath
}

func logDeepChatVersionState(path string, version string, err error) {
	state := "loaded:" + path + ":" + version
	message := fmt.Sprintf("DeepChat version %s loaded from %s", version, path)
	if err != nil {
		state = "failed:" + path + ":" + err.Error()
		message = fmt.Sprintf("DeepChat version unavailable, reading %s failed: %s", path, err.Error())
	}
	deepChatVersionLogMu.Lock()
	changed := deepChatVersionState != state
	deepChatVersionState = state
	deepChatVersionLogMu.Unlock()
	if !changed {
		return
	}
	if err != nil {
		common.SysError(message)
		return
	}
	common.SysLog(message)
}

func readDeepChatPackageVersion(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	var pkg struct {
		Version string `json:"version"`
	}
	if err := common.Unmarshal(data, &pkg); err != nil {
		return "", err
	}
	if pkg.Version == "" {
		return "", fmt.Errorf("version field empty in %s", path)
	}
	return pkg.Version, nil
}

func GetDeepChatVersion() (string, error) {
	path := deepChatPackageJSONPath()
	info, err := os.Stat(path)
	if err != nil {
		logDeepChatVersionState(path, "", err)
		return "", err
	}
	deepChatVersion.mu.Lock()
	defer deepChatVersion.mu.Unlock()
	if deepChatVersion.version != "" &&
		deepChatVersion.modTime.Equal(info.ModTime()) &&
		deepChatVersion.size == info.Size() {
		return deepChatVersion.version, nil
	}
	version, err := readDeepChatPackageVersion(path)
	if err != nil {
		logDeepChatVersionState(path, "", err)
		return "", err
	}
	deepChatVersion.version = version
	deepChatVersion.modTime = info.ModTime()
	deepChatVersion.size = info.Size()
	logDeepChatVersionState(path, version, nil)
	return version, nil
}

func LogDeepChatDownloadStartupState() {
	version, err := GetDeepChatVersion()
	if err != nil {
		return
	}
	if GetTOSService().IsAvailable() {
		common.SysLog("DeepChat installer download is ready")
		return
	}
	common.SysLog(fmt.Sprintf(
		"DeepChat installer download is unavailable, version %s is known but TOS storage is not usable", version))
}

func DeepChatAvailability() (bool, string) {
	version, err := GetDeepChatVersion()
	if err != nil {
		return false, ""
	}
	return GetTOSService().IsAvailable(), version
}

func DeepChatObjectKey(platform string) (string, bool) {
	template, ok := deepChatObjectKeyTemplates[platform]
	if !ok {
		return "", false
	}
	version, err := GetDeepChatVersion()
	if err != nil {
		return "", false
	}
	return fmt.Sprintf(template, version), true
}
