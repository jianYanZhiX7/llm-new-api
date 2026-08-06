package controller

import (
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/gin-gonic/gin"
)

// AlipayDirectPayRequest 直连支付宝下单请求。
type AlipayDirectPayRequest struct {
	Amount int64 `json:"amount"` // 充值数量（按显示类型解释：USD/CNY 单位 或 Tokens 数量）
}

// AlipayDirectQueryRequest 直连支付宝订单状态查询请求。
type AlipayDirectQueryRequest struct {
	TradeNo string `json:"trade_no"`
}

// RequestAlipayDirectAmount 预览应付金额，不创建订单。
// POST /api/user/self/alipay-direct/amount
func RequestAlipayDirectAmount(c *gin.Context) {
	var req AlipayDirectPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}

	minTopup := int64(setting.AlipayDirectMinTopUp)
	if req.Amount < minTopup {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值数量不能小于 " + strconv.FormatInt(minTopup, 10)})
		return
	}

	id := c.GetInt("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}

	payMoney := service.GetAlipayDirectPayMoney(req.Amount, group)
	if err := service.ValidateAlipayAmount(payMoney); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": service.FormatAlipayAmount(payMoney)})
}

// RequestAlipayDirectPay 拉起支付宝电脑网站支付。
// POST /api/user/self/alipay-direct/pay
//
// 流程：
//  1. 校验合规 / 网关启用
//  2. 校验金额下限 + 用户分组
//  3. 写入 model.TopUp(Pending) 记录
//  4. 调用 service.CreateAlipayPagePayment 生成跳转 URL
//  5. 返回 pay_url 给前端
func RequestAlipayDirectPay(c *gin.Context) {
	if !isAlipayDirectTopUpEnabled() {
		common.ApiErrorI18n(c, i18n.MsgPaymentAlipayNotConfig)
		return
	}

	var req AlipayDirectPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}

	minTopup := int64(setting.AlipayDirectMinTopUp)
	if req.Amount < minTopup {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值数量不能小于 " + strconv.FormatInt(minTopup, 10)})
		return
	}

	id := c.GetInt("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}

	payMoney := service.GetAlipayDirectPayMoney(req.Amount, group)
	if err := service.ValidateAlipayAmount(payMoney); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}

	tradeNo := service.GenerateAlipayTradeNo(id)
	subject := service.BuildAlipaySubject(req.Amount)
	formattedAmount := service.FormatAlipayAmount(payMoney)

	// Amount 按显示类型归一化为「单位数」，与 Epay/Stripe 一致，便于后续 QuotaPerUnit 换算。
	amount := req.Amount
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		// 与 controller/topup.go:RequestEpay 中相同的归一化逻辑保持一致
		amount = int64(float64(req.Amount) / common.QuotaPerUnit)
	}

	topUp := &model.TopUp{
		UserId:          id,
		Amount:          amount,
		Money:           payMoney,
		TradeNo:         tradeNo,
		PaymentMethod:   model.PaymentMethodAlipayDirect,
		PaymentProvider: model.PaymentProviderAlipayDirect,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := topUp.Insert(); err != nil {
		logger.LogError(c.Request.Context(), "支付宝直连 创建充值订单失败 user_id="+strconv.Itoa(id)+" trade_no="+tradeNo+" error="+err.Error())
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "创建订单失败"})
		return
	}

	out, err := service.CreateAlipayPagePayment(c.Request.Context(), service.AlipayPagePayInput{
		UserID:      id,
		TradeNo:     tradeNo,
		Subject:     subject,
		TotalAmount: formattedAmount,
		Timeout:     "15m",
	})
	if err != nil {
		logger.LogError(c.Request.Context(), "支付宝直连 拉起支付失败 user_id="+strconv.Itoa(id)+" trade_no="+tradeNo+" amount="+strconv.FormatInt(req.Amount, 10)+" error="+err.Error())
		model.InsertPaymentAuditLog(&model.PaymentAuditLog{
			TradeNo:   tradeNo,
			EventType: model.PaymentAuditEventCreate,
			Provider:  model.PaymentProviderAlipayDirect,
			Status:    model.PaymentAuditStatusFailed,
			Detail:    "拉起支付失败: " + err.Error(),
			ClientIP:  c.ClientIP(),
		})
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}

	logger.LogInfo(c.Request.Context(), "支付宝直连 充值订单创建成功 user_id="+strconv.Itoa(id)+" trade_no="+tradeNo+" amount="+strconv.FormatInt(req.Amount, 10)+" money="+formattedAmount)
	model.InsertPaymentAuditLog(&model.PaymentAuditLog{
		TradeNo:   tradeNo,
		EventType: model.PaymentAuditEventCreate,
		Provider:  model.PaymentProviderAlipayDirect,
		Status:    model.PaymentAuditStatusSuccess,
		Detail:    "订单创建成功 amount=" + strconv.FormatInt(req.Amount, 10) + " money=" + formattedAmount,
		ClientIP:  c.ClientIP(),
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"pay_url":  out.PayURL,
			"order_id": tradeNo,
		},
	})
}

// AlipayDirectNotify 支付宝异步通知回调。
// POST /api/alipay/webhook
//
// 流程：
//  1. 检查合规与 webhook 启用状态
//  2. 解析 form 调用 service.VerifyAlipayNotification 验签
//  3. 校验通知金额与订单金额一致
//  4. 订单级互斥锁（复用 LockOrder/UnlockOrder）
//  5. 仅当 TRADE_SUCCESS / TRADE_FINISHED 时调用 model.RechargeAlipayDirect 加额度
//  6. 始终回写 "success" 给支付宝（即便状态非成功，避免重试轰炸）
func AlipayDirectNotify(c *gin.Context) {
	if !isAlipayDirectWebhookEnabled() {
		logger.LogWarn(c.Request.Context(), "支付宝直连 webhook 被拒绝 reason=webhook_disabled path="+c.Request.RequestURI+" client_ip="+c.ClientIP())
		c.String(http.StatusOK, "fail")
		return
	}

	if err := c.Request.ParseForm(); err != nil {
		logger.LogError(c.Request.Context(), "支付宝直连 webhook 表单解析失败 path="+c.Request.RequestURI+" client_ip="+c.ClientIP()+" error="+err.Error())
		c.String(http.StatusOK, "fail")
		return
	}

	values := url.Values(c.Request.PostForm)
	if len(values) == 0 {
		// 部分场景支付宝用 GET 通知
		values = c.Request.URL.Query()
	}
	if len(values) == 0 {
		logger.LogWarn(c.Request.Context(), "支付宝直连 webhook 参数为空 path="+c.Request.RequestURI+" client_ip="+c.ClientIP())
		c.String(http.StatusOK, "fail")
		return
	}

	rawPayload := values.Encode()

	notify, err := service.VerifyAlipayNotification(c.Request.Context(), values)
	if err != nil {
		logger.LogWarn(c.Request.Context(), "支付宝直连 webhook 验签失败 path="+c.Request.RequestURI+" client_ip="+c.ClientIP()+" error="+err.Error())
		model.InsertPaymentAuditLog(&model.PaymentAuditLog{
			TradeNo:    values.Get("out_trade_no"),
			EventType:  model.PaymentAuditEventNotify,
			Provider:   model.PaymentProviderAlipayDirect,
			Status:     model.PaymentAuditStatusFailed,
			RawPayload: rawPayload,
			Detail:     "验签失败: " + err.Error(),
			ClientIP:   c.ClientIP(),
		})
		c.String(http.StatusOK, "fail")
		return
	}

	logger.LogInfo(c.Request.Context(), "支付宝直连 webhook 验签成功 trade_no="+notify.TradeNo+" out_trade_no="+notify.OutTradeNo+" trade_status="+notify.TradeStatus+" client_ip="+c.ClientIP())
	model.InsertPaymentAuditLog(&model.PaymentAuditLog{
		TradeNo:    notify.OutTradeNo,
		EventType:  model.PaymentAuditEventNotify,
		Provider:   model.PaymentProviderAlipayDirect,
		Status:     model.PaymentAuditStatusInfo,
		RawPayload: rawPayload,
		Detail:     "验签成功 trade_status=" + notify.TradeStatus + " total_amount=" + notify.TotalAmount,
		ClientIP:   c.ClientIP(),
	})

	if !service.IsAlipayTradeSuccess(notify.TradeStatus) {
		logger.LogInfo(c.Request.Context(), "支付宝直连 webhook 忽略非成功状态 trade_no="+notify.TradeNo+" status="+notify.TradeStatus)
		c.String(http.StatusOK, "success")
		return
	}

	// 校验通知金额与订单金额一致，防止金额篡改
	topUp := model.GetTopUpByTradeNo(notify.OutTradeNo)
	if topUp == nil {
		logger.LogWarn(c.Request.Context(), "支付宝直连 webhook 订单不存在 trade_no="+notify.OutTradeNo+" client_ip="+c.ClientIP())
		model.InsertPaymentAuditLog(&model.PaymentAuditLog{
			TradeNo:   notify.OutTradeNo,
			EventType: model.PaymentAuditEventNotify,
			Provider:  model.PaymentProviderAlipayDirect,
			Status:    model.PaymentAuditStatusFailed,
			Detail:    "订单不存在",
			ClientIP:  c.ClientIP(),
		})
		c.String(http.StatusOK, "success")
		return
	}
	if service.FormatAlipayAmount(topUp.Money) != notify.TotalAmount {
		logger.LogWarn(c.Request.Context(), "支付宝直连 webhook 金额不匹配 trade_no="+notify.OutTradeNo+" expected="+service.FormatAlipayAmount(topUp.Money)+" got="+notify.TotalAmount+" client_ip="+c.ClientIP())
		model.InsertPaymentAuditLog(&model.PaymentAuditLog{
			TradeNo:   notify.OutTradeNo,
			EventType: model.PaymentAuditEventNotify,
			Provider:  model.PaymentProviderAlipayDirect,
			Status:    model.PaymentAuditStatusFailed,
			Detail:    "金额不匹配 expected=" + service.FormatAlipayAmount(topUp.Money) + " got=" + notify.TotalAmount,
			ClientIP:  c.ClientIP(),
		})
		c.String(http.StatusOK, "success")
		return
	}

	// 订单级互斥锁，防止支付宝重试与并发补单竞争
	LockOrder(notify.OutTradeNo)
	defer UnlockOrder(notify.OutTradeNo)

	if err := model.RechargeAlipayDirect(notify.OutTradeNo, c.ClientIP()); err != nil {
		// 订单不存在 / 状态错误等业务错误也回 success，避免支付宝持续重试；
		// 真正系统级错误（DB down）由 RechargeAlipayDirect 内部 SysError 上报
		logger.LogError(c.Request.Context(), "支付宝直连 充值处理失败 trade_no="+notify.OutTradeNo+" out_trade_no="+notify.OutTradeNo+" error="+err.Error())
		model.InsertPaymentAuditLog(&model.PaymentAuditLog{
			TradeNo:   notify.OutTradeNo,
			EventType: model.PaymentAuditEventRecharge,
			Provider:  model.PaymentProviderAlipayDirect,
			Status:    model.PaymentAuditStatusFailed,
			Detail:    "充值处理失败: " + err.Error(),
			ClientIP:  c.ClientIP(),
		})
		c.String(http.StatusOK, "success")
		return
	}

	logger.LogInfo(c.Request.Context(), "支付宝直连 充值成功 trade_no="+notify.TradeNo+" out_trade_no="+notify.OutTradeNo+" total_amount="+notify.TotalAmount+" client_ip="+c.ClientIP())
	model.InsertPaymentAuditLog(&model.PaymentAuditLog{
		TradeNo:   notify.OutTradeNo,
		EventType: model.PaymentAuditEventRecharge,
		Provider:  model.PaymentProviderAlipayDirect,
		Status:    model.PaymentAuditStatusSuccess,
		Detail:    "充值成功 trade_no=" + notify.TradeNo + " total_amount=" + notify.TotalAmount,
		ClientIP:  c.ClientIP(),
	})
	c.String(http.StatusOK, "success")
}

// QueryAlipayDirectPayStatus 主动查询支付宝订单状态，作为异步通知的兜底机制。
// POST /api/user/self/alipay-direct/query
//
// 流程：
//  1. 根据 trade_no 查找本地订单，校验归属
//  2. 若本地订单已成功，直接返回
//  3. 若本地订单仍为 Pending，调用 alipay.trade.query 向支付宝确认状态
//  4. 若支付宝返回成功，执行加款（复用 webhook 的 LockOrder + RechargeAlipayDirect 流程）
//  5. 返回当前订单状态
func QueryAlipayDirectPayStatus(c *gin.Context) {
	if !isAlipayDirectTopUpEnabled() {
		common.ApiErrorI18n(c, i18n.MsgPaymentAlipayNotConfig)
		return
	}

	var req AlipayDirectQueryRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.TradeNo == "" {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "缺少订单号"})
		return
	}

	topUp := model.GetTopUpByTradeNo(req.TradeNo)
	if topUp == nil || topUp.UserId != c.GetInt("id") {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "订单不存在"})
		return
	}
	tradeNo := req.TradeNo

	// 已成功，无需查询支付宝
	if topUp.Status == common.TopUpStatusSuccess {
		c.JSON(http.StatusOK, gin.H{"message": "success", "data": gin.H{"status": "success"}})
		return
	}

	// 非待支付状态，直接返回当前状态
	if topUp.Status != common.TopUpStatusPending {
		c.JSON(http.StatusOK, gin.H{"message": "success", "data": gin.H{"status": topUp.Status}})
		return
	}

	// 主动查询支付宝确认订单状态
	queryResult, err := service.QueryAlipayTrade(c.Request.Context(), tradeNo)
	if err != nil {
		logger.LogWarn(c.Request.Context(), "支付宝直连 主动查询失败 trade_no="+tradeNo+" error="+err.Error())
		model.InsertPaymentAuditLog(&model.PaymentAuditLog{
			TradeNo:   tradeNo,
			EventType: model.PaymentAuditEventQuery,
			Provider:  model.PaymentProviderAlipayDirect,
			Status:    model.PaymentAuditStatusFailed,
			Detail:    "主动查询失败: " + err.Error(),
			ClientIP:  c.ClientIP(),
		})
		c.JSON(http.StatusOK, gin.H{"message": "success", "data": gin.H{"status": "pending"}})
		return
	}

	logger.LogInfo(c.Request.Context(), "支付宝直连 主动查询结果 trade_no="+tradeNo+" alipay_trade_no="+queryResult.TradeNo+" trade_status="+queryResult.TradeStatus)
	model.InsertPaymentAuditLog(&model.PaymentAuditLog{
		TradeNo:    tradeNo,
		EventType:  model.PaymentAuditEventQuery,
		Provider:   model.PaymentProviderAlipayDirect,
		Status:     model.PaymentAuditStatusInfo,
		RawPayload: "trade_no=" + queryResult.TradeNo + " trade_status=" + queryResult.TradeStatus + " total_amount=" + queryResult.TotalAmount,
		Detail:     "主动查询完成",
		ClientIP:   c.ClientIP(),
	})

	// 支付宝侧未支付成功，返回待支付
	if !service.IsAlipayTradeSuccess(queryResult.TradeStatus) {
		c.JSON(http.StatusOK, gin.H{"message": "success", "data": gin.H{"status": "pending"}})
		return
	}

	// 校验金额一致性
	if service.FormatAlipayAmount(topUp.Money) != queryResult.TotalAmount {
		logger.LogWarn(c.Request.Context(), "支付宝直连 主动查询金额不匹配 trade_no="+tradeNo+" expected="+service.FormatAlipayAmount(topUp.Money)+" got="+queryResult.TotalAmount)
		model.InsertPaymentAuditLog(&model.PaymentAuditLog{
			TradeNo:   tradeNo,
			EventType: model.PaymentAuditEventQuery,
			Provider:  model.PaymentProviderAlipayDirect,
			Status:    model.PaymentAuditStatusFailed,
			Detail:    "金额不匹配 expected=" + service.FormatAlipayAmount(topUp.Money) + " got=" + queryResult.TotalAmount,
			ClientIP:  c.ClientIP(),
		})
		c.JSON(http.StatusOK, gin.H{"message": "success", "data": gin.H{"status": "pending"}})
		return
	}

	// 支付宝侧已支付成功，执行加款
	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)

	if err := model.RechargeAlipayDirect(tradeNo, c.ClientIP()); err != nil {
		logger.LogError(c.Request.Context(), "支付宝直连 主动查询加款失败 trade_no="+tradeNo+" error="+err.Error())
		model.InsertPaymentAuditLog(&model.PaymentAuditLog{
			TradeNo:   tradeNo,
			EventType: model.PaymentAuditEventRecharge,
			Provider:  model.PaymentProviderAlipayDirect,
			Status:    model.PaymentAuditStatusFailed,
			Detail:    "主动查询加款失败: " + err.Error(),
			ClientIP:  c.ClientIP(),
		})
		c.JSON(http.StatusOK, gin.H{"message": "success", "data": gin.H{"status": "pending"}})
		return
	}

	logger.LogInfo(c.Request.Context(), "支付宝直连 主动查询加款成功 trade_no="+tradeNo+" alipay_trade_no="+queryResult.TradeNo)
	model.InsertPaymentAuditLog(&model.PaymentAuditLog{
		TradeNo:   tradeNo,
		EventType: model.PaymentAuditEventRecharge,
		Provider:  model.PaymentProviderAlipayDirect,
		Status:    model.PaymentAuditStatusSuccess,
		Detail:    "主动查询加款成功 alipay_trade_no=" + queryResult.TradeNo,
		ClientIP:  c.ClientIP(),
	})
	c.JSON(http.StatusOK, gin.H{"message": "success", "data": gin.H{"status": "success"}})
}
