package service

import (
	"fmt"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
	"github.com/volcengine/ve-tos-golang-sdk/v2/tos"
	"github.com/volcengine/ve-tos-golang-sdk/v2/tos/enum"
)

const TOSSignedURLExpires = 1200

type TOSService struct {
	client *tos.ClientV2
}

var (
	tosServiceMu   sync.Mutex
	tosService     *TOSService
	tosConfigState string
)

func GetTOSService() *TOSService {
	tosServiceMu.Lock()
	defer tosServiceMu.Unlock()
	if tosService == nil || tosService.client == nil {
		tosService = initTOSService()
	}
	return tosService
}

func missingTOSConfig() []string {
	required := []struct {
		name  string
		value string
	}{
		{"TOS_ACCESS_KEY", common.TOSAccessKey},
		{"TOS_SECRET_KEY", common.TOSSecretKey},
		{"TOS_ENDPOINT", common.TOSEndpoint},
		{"TOS_BUCKET", common.TOSBucket},
	}
	missing := make([]string, 0, len(required))
	for _, item := range required {
		if item.value == "" {
			missing = append(missing, item.name)
		}
	}
	return missing
}

func logTOSConfigState(state string, log func(string), message string) {
	if tosConfigState == state {
		return
	}
	tosConfigState = state
	log(message)
}

func initTOSService() *TOSService {
	if missing := missingTOSConfig(); len(missing) > 0 {
		logTOSConfigState("missing:"+strings.Join(missing, ","), common.SysLog, fmt.Sprintf(
			"TOS is not fully configured, DeepChat installer download is unavailable, missing: %s",
			strings.Join(missing, ", ")))
		return &TOSService{}
	}
	if common.TOSRegion == "" {
		logTOSConfigState("region-empty:"+common.TOSEndpoint, common.SysLog, fmt.Sprintf(
			"TOS_REGION is empty, signed URLs built against endpoint %s may be rejected", common.TOSEndpoint))
	}
	client, err := tos.NewClientV2(
		common.TOSEndpoint,
		tos.WithRegion(common.TOSRegion),
		tos.WithCredentials(tos.NewStaticCredentials(common.TOSAccessKey, common.TOSSecretKey)),
	)
	if err != nil {
		logTOSConfigState("error:"+err.Error(), common.SysError, fmt.Sprintf(
			"TOS client init failed: %s (endpoint=%s, region=%s, bucket=%s)",
			err.Error(), common.TOSEndpoint, common.TOSRegion, common.TOSBucket))
		return &TOSService{}
	}
	logTOSConfigState("ready:"+common.TOSEndpoint+":"+common.TOSBucket, common.SysLog, fmt.Sprintf(
		"TOS client ready, DeepChat installer download enabled (endpoint=%s, region=%s, bucket=%s)",
		common.TOSEndpoint, common.TOSRegion, common.TOSBucket))
	return &TOSService{client: client}
}

func (s *TOSService) IsAvailable() bool {
	return s != nil && s.client != nil
}

func (s *TOSService) GenerateSignedURL(objectKey string, expires int) (string, error) {
	if !s.IsAvailable() {
		return "", fmt.Errorf("TOS service not available, missing configuration or client init failure")
	}
	if expires <= 0 {
		expires = TOSSignedURLExpires
	}
	output, err := s.client.PreSignedURL(&tos.PreSignedURLInput{
		HTTPMethod: enum.HttpMethodGet,
		Bucket:     common.TOSBucket,
		Key:        objectKey,
		Expires:    int64(expires),
	})
	if err != nil {
		return "", fmt.Errorf("failed to sign object %s: %w", objectKey, err)
	}
	return output.SignedUrl, nil
}
