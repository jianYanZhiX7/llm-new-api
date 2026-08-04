package service

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/shopspring/decimal"

	"github.com/smartwalle/alipay/v3"
)

// AlipayErr 标识支付宝直连业务流程中的可识别错误，
// 调用方据此区分日志级别和给用户的提示。
type AlipayErr struct {
	Code string // machine-readable code, e.g. "not_configured", "sign_failed"
	Msg  string // human-readable message
}

func (e *AlipayErr) Error() string { return fmt.Sprintf("alipay_direct: %s: %s", e.Code, e.Msg) }

const (
	AlipayErrNotConfigured = "not_configured"
	AlipayErrSignFailed    = "sign_failed"
	AlipayErrVerifyFailed  = "verify_failed"
	AlipayErrClientInit    = "client_init_failed"
)

// alipayClientHolder 懒加载并缓存支付宝 SDK 客户端。
// 通过配置指纹检测变更：当 AppId / 私钥 / 三证书 / 沙箱开关任一变化时，
// 下次 GetAlipayClient 会重建客户端，无需外部调用 Reset。
// 这样 model 层不必反向依赖 service，避免循环导入。
var (
	alipayClientMu   sync.Mutex
	alipayClient      *alipay.Client
	alipayClientFp    string
)

// alipayConfigFingerprint 计算当前配置指纹。
// 不包含 NotifyURL/ReturnURL/MinTopUp 等不影响 SDK 客户端身份的配置。
func alipayConfigFingerprint() string {
	parts := []string{
		setting.AlipayDirectAppId,
		setting.AlipayDirectPrivateKey,
		setting.AlipayDirectAppCert,
		setting.AlipayDirectPublicCert,
		setting.AlipayDirectRootCert,
		strconv.FormatBool(setting.AlipayDirectSandbox),
	}
	return strings.Join(parts, "\x00")
}

// GetAlipayClient 返回已加载证书的支付宝客户端。
// 返回 (nil, *AlipayErr) 表示配置不完整或初始化失败，
// 调用方应据此返回 4xx 而非 5xx。
func GetAlipayClient() (*alipay.Client, error) {
	if !isAlipayConfigured() {
		return nil, &AlipayErr{Code: AlipayErrNotConfigured, Msg: "alipay direct payment is not configured"}
	}

	fp := alipayConfigFingerprint()

	alipayClientMu.Lock()
	defer alipayClientMu.Unlock()

	if alipayClient != nil && alipayClientFp == fp {
		return alipayClient, nil
	}

	client, err := buildAlipayClient()
	if err != nil {
		return nil, &AlipayErr{Code: AlipayErrClientInit, Msg: err.Error()}
	}
	alipayClient = client
	alipayClientFp = fp
	return client, nil
}

// IsAlipayDirectEnabled 是暴露给 controller 的便捷谓词，
// 与 controller.isAlipayDirectTopUpEnabled 行为一致但只检查配置完整性。
func IsAlipayDirectEnabled() bool {
	if !operation_setting.IsPaymentComplianceConfirmed() {
		return false
	}
	if !setting.AlipayDirectEnabled {
		return false
	}
	return isAlipayConfigured()
}

// isAlipayConfigured 只检查密钥/证书配置是否齐全，不检查合规与总开关。
func isAlipayConfigured() bool {
	return strings.TrimSpace(setting.AlipayDirectAppId) != "" &&
		strings.TrimSpace(setting.AlipayDirectPrivateKey) != "" &&
		strings.TrimSpace(setting.AlipayDirectAppCert) != "" &&
		strings.TrimSpace(setting.AlipayDirectPublicCert) != "" &&
		strings.TrimSpace(setting.AlipayDirectRootCert) != ""
}

func buildAlipayClient() (*alipay.Client, error) {
	appId := strings.TrimSpace(setting.AlipayDirectAppId)
	privateKey := strings.TrimSpace(setting.AlipayDirectPrivateKey)

	client, err := alipay.New(appId, privateKey, !setting.AlipayDirectSandbox)
	if err != nil {
		return nil, fmt.Errorf("init alipay client: %w", err)
	}

	// 证书模式下三证书必须全部加载，否则后续 TradePagePay 签名/验签会失败
	if err := client.LoadAppCertPublicKey(setting.AlipayDirectAppCert); err != nil {
		return nil, fmt.Errorf("load app cert: %w", err)
	}
	if err := client.LoadAlipayCertPublicKey(setting.AlipayDirectPublicCert); err != nil {
		return nil, fmt.Errorf("load alipay public cert: %w", err)
	}
	if err := client.LoadAliPayRootCert(setting.AlipayDirectRootCert); err != nil {
		return nil, fmt.Errorf("load alipay root cert: %w", err)
	}
	return client, nil
}

// GetAlipayDirectNotifyURL 解析异步回调地址。
// 优先使用 setting.AlipayDirectNotifyURL，否则用 GetCallbackAddress 拼接标准路由。
func GetAlipayDirectNotifyURL() string {
	if u := strings.TrimSpace(setting.AlipayDirectNotifyURL); u != "" {
		return u
	}
	return GetCallbackAddress() + "/api/alipay/webhook"
}

// GetAlipayDirectReturnURL 解析同步跳转地址。
// 优先使用 setting.AlipayDirectReturnURL，否则用 ServerAddress 跳到 /usage-logs。
func GetAlipayDirectReturnURL() string {
	if u := strings.TrimSpace(setting.AlipayDirectReturnURL); u != "" {
		return u
	}
	return PaymentReturnURL("/usage-logs")
}

// GetAlipayDirectPayMoney 将用户输入的 amount 转换成人民币应付金额。
// 与 controller.getPayMoney 行为一致：支持 USD/CNY/Tokens 三种显示类型，
// 应用分组倍率与预设金额优惠折扣，但用 AlipayDirectUnitPrice 替代 Price。
func GetAlipayDirectPayMoney(amount int64, group string) float64 {
	dAmount := decimal.NewFromInt(amount)
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dAmount = dAmount.Div(decimal.NewFromFloat(common.QuotaPerUnit))
	}

	topupGroupRatio := common.GetTopupGroupRatio(group)
	if topupGroupRatio == 0 {
		topupGroupRatio = 1
	}

	discount := 1.0
	if ds, ok := operation_setting.GetPaymentSetting().AmountDiscount[int(amount)]; ok && ds > 0 {
		discount = ds
	}

	payMoney := dAmount.
		Mul(decimal.NewFromFloat(setting.AlipayDirectUnitPrice)).
		Mul(decimal.NewFromFloat(topupGroupRatio)).
		Mul(decimal.NewFromFloat(discount))

	return payMoney.InexactFloat64()
}

// FormatAlipayAmount 金额按支付宝要求保留两位小数，最小单位 0.01 元。
func FormatAlipayAmount(money float64) string {
	return decimal.NewFromFloat(money).StringFixed(2)
}

// AlipayPagePayInput 下单参数（业务层视角，与 HTTP 层解耦）。
type AlipayPagePayInput struct {
	UserID      int
	UserName    string
	TradeNo     string
	Subject     string
	TotalAmount string // 已格式化的两位小数人民币金额
	Timeout     string // 例如 "15m"；空表示用支付宝默认
}

// AlipayPagePayOutput 下单返回。
type AlipayPagePayOutput struct {
	PayURL string // 完整跳转 URL（含 query），前端可直接 window.location.href
}

// CreateAlipayPagePayment 调用 alipay.trade.page.pay 生成 PC 网站支付跳转 URL。
// 不在此处创建本地订单——controller 在调用前已写好 model.TopUp Pending 记录，
// 本函数只负责与支付宝网关的协议交互。
func CreateAlipayPagePayment(ctx context.Context, in AlipayPagePayInput) (*AlipayPagePayOutput, error) {
	client, err := GetAlipayClient()
	if err != nil {
		return nil, err
	}

	param := alipay.TradePagePay{
		Trade: alipay.Trade{
			NotifyURL:    GetAlipayDirectNotifyURL(),
			ReturnURL:    GetAlipayDirectReturnURL(),
			Subject:      in.Subject,
			OutTradeNo:   in.TradeNo,
			TotalAmount:  in.TotalAmount,
			ProductCode:  "FAST_INSTANT_TRADE_PAY",
			TimeoutExpress: in.Timeout,
		},
	}

	if setting.AlipayDirectSellerId != "" {
		param.SellerId = setting.AlipayDirectSellerId
	}

	payURL, err := client.TradePagePay(param)
	if err != nil {
		return nil, &AlipayErr{Code: AlipayErrSignFailed, Msg: fmt.Sprintf("alipay.trade.page.pay failed: %s", err.Error())}
	}

	return &AlipayPagePayOutput{PayURL: payURL.String()}, nil
}

// AlipayNotificationResult 回调解析结果（验签已通过）。
type AlipayNotificationResult struct {
	OutTradeNo  string
	TradeNo     string
	TradeStatus string
	TotalAmount string
	AppId       string
	SellerId    string
	NotifyTime  string
}

// VerifyAlipayNotification 验签并解析异步通知 form。
// 二次校验 app_id / seller_id 防止跨应用消息混入。
func VerifyAlipayNotification(ctx context.Context, values url.Values) (*AlipayNotificationResult, error) {
	client, err := GetAlipayClient()
	if err != nil {
		return nil, err
	}

	notification, err := client.DecodeNotification(ctx, values)
	if err != nil {
		return nil, &AlipayErr{Code: AlipayErrVerifyFailed, Msg: fmt.Sprintf("decode notification: %s", err.Error())}
	}
	if notification == nil {
		return nil, &AlipayErr{Code: AlipayErrVerifyFailed, Msg: "empty notification"}
	}

	result := &AlipayNotificationResult{
		OutTradeNo:  notification.OutTradeNo,
		TradeNo:    notification.TradeNo,
		TradeStatus: string(notification.TradeStatus),
		TotalAmount: notification.TotalAmount,
		AppId:       notification.AppId,
		SellerId:    notification.SellerId,
		NotifyTime:  notification.NotifyTime,
	}

	// 二次校验：app_id 必须匹配当前应用
	if expectedAppId := strings.TrimSpace(setting.AlipayDirectAppId); expectedAppId != "" && result.AppId != expectedAppId {
		return result, &AlipayErr{Code: AlipayErrVerifyFailed, Msg: fmt.Sprintf("app_id mismatch: got %s expected %s", result.AppId, expectedAppId)}
	}
	// 若配置了 seller_id，必须匹配；未配置则跳过此检查（用签约默认账号）
	if expectedSeller := strings.TrimSpace(setting.AlipayDirectSellerId); expectedSeller != "" && result.SellerId != "" && result.SellerId != expectedSeller {
		return result, &AlipayErr{Code: AlipayErrVerifyFailed, Msg: fmt.Sprintf("seller_id mismatch: got %s expected %s", result.SellerId, expectedSeller)}
	}

	return result, nil
}

// IsAlipayTradeSuccess 判断 trade_status 是否表示支付成功（含 TRADE_FINISHED，
// 因为 TRADE_FINISHED 表示不可退款，资金已确认到账）。
func IsAlipayTradeSuccess(status string) bool {
	return status == string(alipay.TradeStatusSuccess) || status == string(alipay.TradeStatusFinished)
}

// GenerateAlipayTradeNo 生成商户订单号，与项目其他支付方式的格式保持一致：
// USR{userId}NO{6位随机}{unix时间戳}。
func GenerateAlipayTradeNo(userID int) string {
	return fmt.Sprintf("USR%dNO%s%d", userID, common.GetRandomString(6), time.Now().Unix())
}

// BuildAlipaySubject 生成订单标题。如果系统名称为空，回退到 "New API"。
func BuildAlipaySubject(amount int64) string {
	name := strings.TrimSpace(common.SystemName)
	if name == "" {
		name = "New API"
	}
	return fmt.Sprintf("%s TopUp %d", name, amount)
}

// ValidateAlipayAmount 金额下限检查。复用现有 0.01 元下限。
func ValidateAlipayAmount(payMoney float64) error {
	if payMoney < 0.01 {
		return errors.New("recharge amount too low")
	}
	return nil
}
