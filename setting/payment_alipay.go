package setting

import (
	"os"
	"path/filepath"
	"strings"
)

// Alipay 直连支付配置（电脑网站支付 - 证书模式）
//
// 与 Epay 聚合的 type=alipay 不同，这是直接调用支付宝开放平台的实现，
// 不经过任何中间商。配置项命名加 Direct 后缀避免与 Epay 的支付宝混淆。
//
// 敏感信息（私钥、证书）从 cert/alipay/ 目录下的文件中加载，
// 不在代码中硬编码，也不存入数据库 option 表。
// 文件由 deploy.sh 上传到服务器。
//
// cert/alipay/ 目录结构：
//   app_private_key.pem       — 应用私钥（PKCS1/PKCS8 PEM）
//   app_cert_public_key.crt   — 应用公钥证书
//   alipay_cert_public_key.crt — 支付宝公钥证书
//   alipay_root_cert.crt     — 支付宝根证书
var (
	AlipayDirectEnabled    bool
	AlipayDirectSandbox    = false
	AlipayDirectAppId      = "" // 通过 option 系统配置
	AlipayDirectPrivateKey = "" // 从 cert/alipay/app_private_key.pem 加载
	AlipayDirectAppCert    = "" // 从 cert/alipay/app_cert_public_key.crt 加载
	AlipayDirectPublicCert = "" // 从 cert/alipay/alipay_cert_public_key.crt 加载
	AlipayDirectRootCert   = "" // 从 cert/alipay/alipay_root_cert.crt 加载

	AlipayDirectNotifyURL = "" // 留空自动用 ServerAddress + /api/alipay/webhook
	AlipayDirectReturnURL = "" // 留空自动用 ServerAddress + /usage-logs
	AlipayDirectSellerId  = "" // 通过 option 系统配置
	AlipayDirectUnitPrice = 7.3
	AlipayDirectMinTopUp  = 1
)

func init() {
	loadAlipayCredentials()
}

func loadAlipayCredentials() {
	baseDir := filepath.Join("cert", "alipay")

	// 从文件加载初始值，DB option 系统可在此基础上覆盖
	if v := readFileTrimmed(filepath.Join(baseDir, "app_id.txt")); v != "" {
		AlipayDirectAppId = v
	}
	if v := readFileTrimmed(filepath.Join(baseDir, "seller_id.txt")); v != "" {
		AlipayDirectSellerId = v
	}
	AlipayDirectPrivateKey = readFileTrimmed(filepath.Join(baseDir, "app_private_key.pem"))
	AlipayDirectAppCert = readFileTrimmed(filepath.Join(baseDir, "app_cert_public_key.crt"))
	AlipayDirectPublicCert = readFileTrimmed(filepath.Join(baseDir, "alipay_cert_public_key.crt"))
	AlipayDirectRootCert = readFileTrimmed(filepath.Join(baseDir, "alipay_root_cert.crt"))
}

func readFileTrimmed(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}
